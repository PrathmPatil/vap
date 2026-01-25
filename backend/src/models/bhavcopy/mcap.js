// models/mcap.js
export default function MCAPModel(sequelize, DataTypes) {
  return sequelize.define('mcap', {
    Trade_Date: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Symbol: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Series: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Security_Name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Category: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Last_Trade_Date: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Face_Value_Rs: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    Issue_Size: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    Close_Price_Paid_up_value_Rs: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    Market_Cap_Rs: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    source_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'mcap',
    timestamps: false,
  });
}
