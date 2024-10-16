import bcrypt from 'bcrypt';

const password = 'l2R1VBl7zPfw';  // Замінити на фактичний пароль
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
  if (err) throw err;
  console.log(hash);  // Це значення потрібно буде вставити в .env як ADMIN_PASSWORD_HASH
});
