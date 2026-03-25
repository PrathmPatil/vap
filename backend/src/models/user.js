export default (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      username: { type: DataTypes.STRING(50)},
      email: { type: DataTypes.STRING(255), unique: true },
      password: DataTypes.STRING(255),
      role:{ type: DataTypes.STRING(50), defaultValue: 'user' },
      phoneNumber: DataTypes.STRING(20),
      whatsappNumber: DataTypes.STRING(20),
    },
    {
      tableName: 'users',
      timestamps: true
    }
  );

  User.associate = (models) => {
    User.hasMany(models.Portfolio, {
      foreignKey: 'userId',
      sourceKey: 'id'
    });
  };

  return User;
};

// geneate payload ror above 
// {
//   "username": "john_doe",
//   "email": "RwTQ3@example.com",
//   "password": "password123",
//   "phoneNumber": "1234567890",
//   "whatsappNumber": "0987654321"
// }
// write all input fileds in single line
// username, email, password, phoneNumber, whatsappNumber