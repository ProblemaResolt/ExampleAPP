const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 住所を分割するヘルパー関数
function splitAddress(address) {
  if (!address) {
    return {
      prefecture: null,
      city: null,
      streetAddress: null
    };
  }

  // 基本的な住所解析（日本の住所フォーマットに基づく）
  // 例: "東京都新宿区西新宿1-1-1" -> prefecture: "東京都", city: "新宿区", streetAddress: "西新宿1-1-1"
  
  // 都道府県の正規表現パターン
  const prefecturePattern = /(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/;
  
  const prefectureMatch = address.match(prefecturePattern);
  
  if (prefectureMatch) {
    const prefecture = prefectureMatch[1];
    const remaining = address.substring(prefectureMatch.index + prefecture.length);
    
    // 市区町村の正規表現パターン
    const cityPattern = /^([^0-9一-九０-９]+(?:市|区|町|村))/;
    const cityMatch = remaining.match(cityPattern);
    
    if (cityMatch) {
      const city = cityMatch[1];
      const streetAddress = remaining.substring(cityMatch[0].length).trim();
      
      return {
        prefecture,
        city,
        streetAddress: streetAddress || null
      };
    } else {
      // 市区町村が見つからない場合
      return {
        prefecture,
        city: null,
        streetAddress: remaining.trim() || null
      };
    }
  } else {
    // 都道府県が見つからない場合は、全体を streetAddress とする
    return {
      prefecture: null,
      city: null,
      streetAddress: address.trim()
    };
  }
}

async function migrateAddressData() {
  try {
    console.log('住所データの移行を開始します...');
    
    // address フィールドが null でないユーザーを取得
    const usersWithAddress = await prisma.user.findMany({
      where: {
        address: {
          not: null
        }
      },
      select: {
        id: true,
        address: true,
        firstName: true,
        lastName: true
      }
    });

    console.log(`${usersWithAddress.length}人のユーザーの住所データを移行します...`);

    for (const user of usersWithAddress) {
      const { prefecture, city, streetAddress } = splitAddress(user.address);
      
      console.log(`\n${user.lastName} ${user.firstName}:`);
      console.log(`  元の住所: ${user.address}`);
      console.log(`  分割後 - 都道府県: ${prefecture}, 市町村: ${city}, 番地: ${streetAddress}`);
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          prefecture,
          city,
          streetAddress
        }
      });
    }

    console.log('\n住所データの移行が完了しました！');
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAddressData();
