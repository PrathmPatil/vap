export default (sequelize, DataTypes) => {
  const StockPrice = sequelize.define('StockPrice', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATE, allowNull: false },
    open: DataTypes.DECIMAL(10, 2),
    high: DataTypes.DECIMAL(10, 2),
    low: DataTypes.DECIMAL(10, 2),
    close: DataTypes.DECIMAL(10, 2),
    volume: DataTypes.BIGINT,
  });

  StockPrice.associate = (models) => {
    StockPrice.belongsTo(models.Companies, {
      foreignKey: 'companyId',
      onDelete: 'CASCADE',
    });
  };

  return StockPrice;
};
