const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/error');
const { authenticate, authorize } = require('../middleware/authentication');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();
const prisma = new PrismaClient();

// Validation middleware
const validateSubscription = [
  body('plan').isIn(['BASIC', 'PRO', 'ENTERPRISE']),
  body('paymentMethodId').optional().isString(),
  body('couponCode').optional().isString()
];

// Get all subscriptions (admin only)
router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, plan } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          company: {
            select: {
              id: true,
              name: true,
              manager: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.subscription.count({ where })
    ]);

    res.json({
      status: 'success',
      data: {
        subscriptions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get company subscription
router.get('/company/:companyId', authenticate, async (req, res, next) => {
  try {
    const { companyId } = req.params;

    // Check access permissions
    if (req.user.role !== 'ADMIN' && 
        req.user.role !== 'COMPANY' && 
        req.user.companyId !== companyId) {
      throw new AppError('You do not have access to this subscription', 403);
    }

    const subscription = await prisma.subscription.findFirst({
      where: { companyId },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    res.json({
      status: 'success',
      data: { subscription }
    });
  } catch (error) {
    next(error);
  }
});

// Create subscription
router.post('/company/:companyId', authenticate, authorize('ADMIN', 'COMPANY'), validateSubscription, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { companyId } = req.params;
    const { plan, paymentMethodId, couponCode } = req.body;

    // Get company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { manager: true }
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Check access permissions
    if (req.user.role === 'COMPANY' && company.manager.id !== req.user.id) {
      throw new AppError('You can only create subscriptions for your own company', 403);
    }

    // Check if company already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        companyId,
        status: 'ACTIVE'
      }
    });

    if (existingSubscription) {
      throw new AppError('Company already has an active subscription', 400);
    }

    // Get plan details
    const planDetails = {
      BASIC: { price: 1000, name: 'Basic Plan' },
      PRO: { price: 2000, name: 'Pro Plan' },
      ENTERPRISE: { price: 5000, name: 'Enterprise Plan' }
    }[plan];

    // Apply coupon if provided
    let finalPrice = planDetails.price;
    let coupon = null;

    if (couponCode) {
      coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode,
          isActive: true,
          expiryDate: { gt: new Date() }
        }
      });

      if (coupon) {
        finalPrice = Math.max(0, finalPrice - coupon.discountAmount);
      }
    }

    // Create Stripe customer if not exists
    let customer = await prisma.stripeCustomer.findUnique({
      where: { companyId }
    });

    if (!customer) {
      const stripeCustomer = await stripe.customers.create({
        email: company.manager.email,
        name: company.name,
        metadata: {
          companyId: company.id
        }
      });

      customer = await prisma.stripeCustomer.create({
        data: {
          companyId,
          stripeCustomerId: stripeCustomer.id
        }
      });
    }

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customer.stripeCustomerId,
      items: [{ price: process.env[`STRIPE_${plan}_PRICE_ID`] }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      coupon: coupon?.stripeCouponId
    });

    // Create subscription in database
    const subscription = await prisma.subscription.create({
      data: {
        companyId,
        plan,
        status: 'PENDING',
        stripeSubscriptionId: stripeSubscription.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        amount: finalPrice,
        couponId: coupon?.id
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: {
        subscription,
        clientSecret: stripeSubscription.latest_invoice.payment_intent.client_secret
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update subscription
router.patch('/:subscriptionId', authenticate, authorize('ADMIN', 'COMPANY'), validateSubscription, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }

    const { subscriptionId } = req.params;
    const { plan, paymentMethodId } = req.body;

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        company: {
          include: { manager: true }
        }
      }
    });

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    // Check access permissions
    if (req.user.role === 'COMPANY' && subscription.company.manager.id !== req.user.id) {
      throw new AppError('You can only update subscriptions for your own company', 403);
    }

    // Update Stripe subscription
    const stripeSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [{ price: process.env[`STRIPE_${plan}_PRICE_ID`] }],
        proration_behavior: 'always_invoice'
      }
    );

    // Update subscription in database
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        plan,
        status: stripeSubscription.status.toUpperCase(),
        amount: stripeSubscription.items.data[0].price.unit_amount / 100
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { subscription: updatedSubscription }
    });
  } catch (error) {
    next(error);
  }
});

// Cancel subscription
router.post('/:subscriptionId/cancel', authenticate, authorize('ADMIN', 'COMPANY'), async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        company: {
          include: { manager: true }
        }
      }
    });

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    // Check access permissions
    if (req.user.role === 'COMPANY' && subscription.company.manager.id !== req.user.id) {
      throw new AppError('You can only cancel subscriptions for your own company', 403);
    }

    // Cancel Stripe subscription
    await stripe.subscriptions.del(subscription.stripeSubscriptionId);

    // Update subscription in database
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        endDate: new Date()
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { subscription: updatedSubscription }
    });
  } catch (error) {
    next(error);
  }
});

// Webhook handler for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status.toUpperCase(),
            endDate: new Date(subscription.current_period_end * 1000)
          }
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: 'CANCELLED',
            endDate: new Date()
          }
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await prisma.subscription.update({
            where: { stripeSubscriptionId: invoice.subscription },
            data: {
              status: 'ACTIVE',
              lastPaymentDate: new Date(),
              lastPaymentAmount: invoice.amount_paid / 100
            }
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await prisma.subscription.update({
            where: { stripeSubscriptionId: invoice.subscription },
            data: {
              status: 'PAYMENT_FAILED',
              lastPaymentError: invoice.last_payment_error?.message
            }
          });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Get all subscriptions
router.get('/all', authenticate, async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ message: 'Failed to fetch subscriptions' });
  }
});

// Create new subscription
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  const {
    companyId,
    plan,
    startDate,
    endDate,
    autoRenew,
    paymentMethod,
    billingCycle
  } = req.body;

  try {
    // Validate company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        companyId,
        plan,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        autoRenew,
        paymentMethod,
        billingCycle,
        status: 'active'
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Create initial payment record
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: calculateAmount(plan, billingCycle),
        status: 'pending',
        paymentMethod,
        date: new Date(),
        transactionId: generateTransactionId()
      }
    });

    res.status(201).json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ message: 'Failed to create subscription' });
  }
});

// Update subscription
router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const { id } = req.params;
  const {
    plan,
    startDate,
    endDate,
    autoRenew,
    paymentMethod,
    billingCycle,
    status
  } = req.body;

  try {
    // Validate subscription exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: { id }
    });

    if (!existingSubscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Update subscription
    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        plan,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        autoRenew,
        paymentMethod,
        billingCycle,
        status
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json(subscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ message: 'Failed to update subscription' });
  }
});

// Delete subscription
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const { id } = req.params;

  try {
    // Validate subscription exists
    const subscription = await prisma.subscription.findUnique({
      where: { id }
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Delete associated payments first
    await prisma.payment.deleteMany({
      where: { subscriptionId: id }
    });

    // Delete subscription
    await prisma.subscription.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ message: 'Failed to delete subscription' });
  }
});

// Get subscription payments
router.get('/:id/payments', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    // Validate subscription exists
    const subscription = await prisma.subscription.findUnique({
      where: { id }
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Get payments
    const payments = await prisma.payment.findMany({
      where: { subscriptionId: id },
      orderBy: {
        date: 'desc'
      }
    });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching subscription payments:', error);
    res.status(500).json({ message: 'Failed to fetch subscription payments' });
  }
});

// Get subscription overview statistics
router.get('/overview', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [activeSubscriptions, totalRevenue, expiringSoon] = await Promise.all([
      // Count active subscriptions
      prisma.subscription.count({
        where: {
          status: 'ACTIVE'
        }
      }),
      // Calculate total monthly revenue
      prisma.subscription.aggregate({
        where: {
          status: 'ACTIVE'
        },
        _sum: {
          amount: true
        }
      }),
      // Count subscriptions expiring soon
      prisma.subscription.count({
        where: {
          status: 'ACTIVE',
          endDate: {
            gte: now,
            lte: thirtyDaysFromNow
          }
        }
      })
    ]);

    res.json({
      status: 'success',
      data: {
        activeSubscriptions,
        totalRevenue: totalRevenue._sum.amount || 0,
        expiringSoon
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
function calculateAmount(plan, billingCycle) {
  const planPrices = {
    basic: 99,
    professional: 199,
    enterprise: 499
  };

  const multipliers = {
    monthly: 1,
    quarterly: 3,
    annual: 12
  };

  return planPrices[plan] * multipliers[billingCycle];
}

function generateTransactionId() {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = router; 