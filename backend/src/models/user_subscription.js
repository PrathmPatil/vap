export default function UserSubscriptionModel(sequelize, DataTypes) {
  return sequelize.define(
    'user_subscriptions',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      plan_id: { type: DataTypes.STRING(20), allowNull: false },
      plan_name: { type: DataTypes.STRING(80), allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'INR',
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active',
      },
      started_at: { type: DataTypes.DATE, allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'user_subscriptions',
      timestamps: false,
      indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'status'] },
        { fields: ['expires_at'] },
      ],
    },
  );
}
