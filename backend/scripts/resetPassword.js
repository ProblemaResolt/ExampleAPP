const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const email = 'company1@example.com';
    const newPassword = 'Company123!';
    
    console.log(`🔧 ${email} のパスワードをリセットしています...`);
    
    // 新しいパスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('新しいハッシュ:', hashedPassword);
    
    // パスワードを更新
    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: { password: hashedPassword }
    });
    
    console.log('✅ パスワードがリセットされました');
    console.log('ユーザー:', updatedUser.email);
    console.log('名前:', updatedUser.lastName, updatedUser.firstName);
    
    // 検証テスト
    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    console.log('✅ パスワード検証テスト:', isValid);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
