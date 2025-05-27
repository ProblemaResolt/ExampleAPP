import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  CreditCard as CreditCardIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/axios';
import { format } from 'date-fns';

// Quick action buttons
const QuickActions = ({ onAction }) => (
  <Grid container spacing={2}>
    <Grid item xs={12} sm={4}>
      <Button
        fullWidth
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => onAction('addUser')}
      >
        Add User
      </Button>
    </Grid>
    <Grid item xs={12} sm={4}>
      <Button
        fullWidth
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => onAction('addCompany')}
      >
        Add Company
      </Button>
    </Grid>
    <Grid item xs={12} sm={4}>
      <Button
        fullWidth
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => onAction('addSubscription')}
      >
        Add Subscription
      </Button>
    </Grid>
  </Grid>
);

// Subscription overview card
const SubscriptionOverview = ({ data, isLoading, error }) => {
  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const overviewData = data?.data ?? {};
  const activeSubscriptions = overviewData.activeSubscriptions ?? 0;
  const totalRevenue = overviewData.totalRevenue ?? 0;
  const expiringSoon = overviewData.expiringSoon ?? 0;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Subscription Overview
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {activeSubscriptions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Subscriptions
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {totalRevenue}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monthly Revenue
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {expiringSoon}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expiring Soon
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// Recent activities card
const RecentActivities = ({ data, isLoading, error }) => {
  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const activities = data?.data ?? [];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Activities
        </Typography>
        <List>
          {activities.map((activity, index) => (
            <Box key={activity.id}>
              <ListItem>
                <ListItemIcon>
                  {activity.type === 'user' && <PeopleIcon />}
                  {activity.type === 'company' && <BusinessIcon />}
                  {activity.type === 'subscription' && <CreditCardIcon />}
                  {activity.type === 'payment' && <PaymentIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={activity.description}
                  secondary={format(new Date(activity.timestamp), 'PPp')}
                />
              </ListItem>
              {index < activities.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [error] = useState('');

  const fetchSubscriptionOverview = async () => {
    try {
      const response = await api.get('/api/subscriptions/overview');
      return response.data;
    } catch (e) {
      console.error("fetchSubscriptionOverview error:", e);
      throw e;
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const response = await api.get('/api/activities/recent');
      return response.data;
    } catch (e) {
      console.error("fetchRecentActivities error:", e);
      throw e;
    }
  };

  const { data: subscriptionOverview, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription-overview'],
    queryFn: fetchSubscriptionOverview
  });

  const { data: recentActivities, isLoading: isLoadingActivities } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: fetchRecentActivities
  });

  const handleQuickAction = (action) => {
    switch (action) {
      case 'addUser':
        navigate('/users/new');
        break;
      case 'addCompany':
        navigate('/companies/new');
        break;
      case 'addSubscription':
        navigate('/subscriptions/new');
        break;
      default:
        break;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <QuickActions onAction={handleQuickAction} />
            </CardContent>
          </Card>
        </Grid>

        {/* Subscription Overview */}
        <Grid item xs={12} md={8}>
          <SubscriptionOverview
            data={subscriptionOverview}
            isLoading={isLoadingSubscription}
          />
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={4}>
          <RecentActivities
            data={recentActivities}
            isLoading={isLoadingActivities}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 