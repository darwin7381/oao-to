// 檢查當前登入狀態
const token = localStorage.getItem('token');
if (!token) {
  console.log('❌ 沒有 token，請先登入');
} else {
  // 解析 JWT
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  console.log('✅ 已登入');
  console.log('User ID:', payload.userId);
  console.log('Email:', payload.email);
  console.log('Role:', payload.role);
  console.log('Token 過期時間:', new Date(payload.exp * 1000).toLocaleString());
}
