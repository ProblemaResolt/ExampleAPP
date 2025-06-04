const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// テスト用連絡先データ
const contactData = [
  {
    email: 'admin@example.com',
    phone: '03-1234-5678',
    address: '東京都千代田区大手町1-1-1 大手町ビル10F'
  },
  {
    email: 'admin2@example.com',
    phone: '06-9876-5432',
    address: '大阪府大阪市北区梅田2-2-2 梅田スカイビル20F'
  },
  {
    email: 'superadmin@example.com',
    phone: '052-1111-2222',
    address: '愛知県名古屋市中村区名駅3-3-3 JRセントラルタワーズ15F'
  },
  {
    email: 'company1@example.com',
    phone: '045-3333-4444',
    address: '神奈川県横浜市西区みなとみらい4-4-4 ランドマークタワー25F'
  },
  {
    email: 'company2@example.com',
    phone: '075-5555-6666',
    address: '京都府京都市下京区烏丸通五条下る5-5-5 京都タワービル8F'
  },
  {
    email: 'manager1@example.com',
    phone: '092-7777-8888',
    address: '福岡県福岡市博多区博多駅前6-6-6 博多駅前ビル12F'
  },
  {
    email: 'manager2@example.com',
    phone: '011-9999-0000',
    address: '北海道札幌市中央区大通西7-7-7 札幌パークビル18F'
  },
  {
    email: 'employee1@example.com',
    phone: '022-1212-3434',
    address: '宮城県仙台市青葉区一番町8-8-8 仙台トラストタワー22F'
  },
  {
    email: 'employee2@example.com',
    phone: '048-5656-7878',
    address: '埼玉県さいたま市大宮区桜木町9-9-9 大宮ソニックシティ30F'
  },
  {
    email: 'employee3@example.com',
    phone: '043-9090-1212',
    address: '千葉県千葉市中央区新町10-10-10 千葉中央ビル16F'
  }
];

async function updateUserContactInfo() {
  console.log('Updating user contact information...');

  try {
    let updatedCount = 0;

    for (const contact of contactData) {
      const user = await prisma.user.findUnique({
        where: { email: contact.email }
      });

      if (user) {
        await prisma.user.update({
          where: { email: contact.email },
          data: {
            phone: contact.phone,
            address: contact.address
          }
        });
        console.log(`Updated contact info for: ${contact.email}`);
        updatedCount++;
      } else {
        console.log(`User not found: ${contact.email}`);
      }
    }

    console.log(`\nContact information update completed!`);
    console.log(`Total users updated: ${updatedCount}`);

    // 更新されたユーザー一覧を表示
    const usersWithContact = await prisma.user.findMany({
      where: {
        OR: [
          { phone: { not: null } },
          { address: { not: null } }
        ]
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        role: true
      }
    });

    console.log('\n--- Users with contact information ---');
    usersWithContact.forEach(user => {
      console.log(`${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Phone: ${user.phone || 'Not set'}`);
      console.log(`  Address: ${user.address || 'Not set'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error updating contact information:', error);
    throw error;
  }
}

async function main() {
  try {
    await updateUserContactInfo();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
