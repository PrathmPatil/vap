// models/bh.js
export default function BHModel(sequelize, DataTypes) {
  return sequelize.define('bh', {
    SYMBOL: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    SERIES: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    SECURITY: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    high_low: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'HIGH_LOW',  // map to DB column with slash
    },
    // index_flag: {
    //   type: DataTypes.DOUBLE,
    //   allowNull: true,
    //   field: 'INDEX FLAG', // map to DB column with space
    // },
    source_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'bh',
    timestamps: false,
  });
}
