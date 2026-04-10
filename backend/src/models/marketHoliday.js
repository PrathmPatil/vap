export default (sequelize, DataTypes) => {
  const MarketHolidays = sequelize.define(
    'market_holidays',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      holiday_date: {
        type: DataTypes.DATEONLY
      },
      day: {
        type: DataTypes.STRING(20)
      },
      description: {
        type: DataTypes.STRING(500)
      },
      segment: {
        type: DataTypes.STRING(10)
      },
      sr_no: {
        type: DataTypes.INTEGER
      },
      morning_session: {
        type: DataTypes.STRING(50)
      },
      evening_session: {
        type: DataTypes.STRING(50)
      },
      source: {
        type: DataTypes.STRING(100)
      },
      is_active: {
        type: DataTypes.TINYINT(1)
      },
      created_at: {
        type: DataTypes.DATE
      },
      updated_at: {
        type: DataTypes.DATE
      }
    },
    {
      tableName: 'market_holidays',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['holiday_date'] }]
    }
  );
  return MarketHolidays;
};

