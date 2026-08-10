export default function AllIndicesModel(sequelize, DataTypes) {
  return sequelize.define(
    'all_indices',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      col_open: { type: DataTypes.TEXT, field: 'col_open' },
      pe: { type: DataTypes.TEXT },
      low: { type: DataTypes.TEXT },
      percentchange: { type: DataTypes.TEXT },
      variation: { type: DataTypes.TEXT },
      col_index: { type: DataTypes.TEXT },
      yearlow: { type: DataTypes.TEXT },
      indexsymbol: { type: DataTypes.TEXT },
      high: { type: DataTypes.TEXT },
      yearhigh: { type: DataTypes.TEXT },
      previousclose: { type: DataTypes.TEXT },
      last: { type: DataTypes.TEXT },
      pb: { type: DataTypes.TEXT },
      col_key: { type: DataTypes.TEXT },
      perchange30d: { type: DataTypes.TEXT },
      perchange365d: { type: DataTypes.TEXT },
    },
    {
      tableName: 'all_indices',
      timestamps: false,
    }
  );
}
