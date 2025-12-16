// NseDynamic

// mysql> desc all_indices;
// +-----------------+----------+------+-----+---------+----------------+
// | Field           | Type     | Null | Key | Default | Extra          |
// +-----------------+----------+------+-----+---------+----------------+
// | id              | int      | NO   | PRI | NULL    | auto_increment |
// | oneWeekAgo      | longtext | YES  |     | NULL    |                |
// | previousDayVal  | longtext | YES  |     | NULL    |                |
// | declines        | longtext | YES  |     | NULL    |                |
// | percentChange   | longtext | YES  |     | NULL    |                |
// | unchanged       | longtext | YES  |     | NULL    |                |
// | chart365dPath   | longtext | YES  |     | NULL    |                |
// | indicativeClose | longtext | YES  |     | NULL    |                |
// | yearHigh        | longtext | YES  |     | NULL    |                |
// | col_key         | longtext | YES  |     | NULL    |                |
// | last            | longtext | YES  |     | NULL    |                |
// | yearLow         | longtext | YES  |     | NULL    |                |
// | oneMonthAgoVal  | longtext | YES  |     | NULL    |                |
// | previousDay     | longtext | YES  |     | NULL    |                |
// | pe              | longtext | YES  |     | NULL    |                |
// | col_open        | longtext | YES  |     | NULL    |                |
// | chartTodayPath  | longtext | YES  |     | NULL    |                |
// | high            | longtext | YES  |     | NULL    |                |
// | col_index       | longtext | YES  |     | NULL    |                |
// | oneWeekAgoVal   | longtext | YES  |     | NULL    |                |
// | pb              | longtext | YES  |     | NULL    |                |
// | previousClose   | longtext | YES  |     | NULL    |                |
// | date365dAgo     | longtext | YES  |     | NULL    |                |
// | low             | longtext | YES  |     | NULL    |                |
// | chart30dPath    | longtext | YES  |     | NULL    |                |
// | dy              | longtext | YES  |     | NULL    |                |
// | advances        | longtext | YES  |     | NULL    |                |
// | oneYearAgoVal   | longtext | YES  |     | NULL    |                |
// | indexSymbol     | longtext | YES  |     | NULL    |                |
// | variation       | longtext | YES  |     | NULL    |                |
// | date30dAgo      | longtext | YES  |     | NULL    |                |
// | perChange30d    | longtext | YES  |     | NULL    |                |
// | perChange365d   | longtext | YES  |     | NULL    |                |
// +-----------------+----------+------+-----+---------+----------------+
// 33 rows in set (0.00 sec)
export default (sequelize, DataTypes) => {
    const NseDynamic = sequelize.define(
      'nse_dynamic',
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        oneWeekAgo: { type: DataTypes.TEXT },
        previousDayVal: { type: DataTypes.TEXT },
        declines: { type: DataTypes.TEXT }, 
        percentChange: { type: DataTypes.TEXT },
        unchanged: { type: DataTypes.TEXT },
        chart365dPath: { type: DataTypes.TEXT },
        indicativeClose: { type: DataTypes.TEXT },
        yearHigh: { type: DataTypes.TEXT },
        col_key: { type: DataTypes.TEXT },
        last: { type: DataTypes.TEXT },
        yearLow: { type: DataTypes.TEXT },
        oneMonthAgoVal: { type: DataTypes.TEXT },
        previousDay: { type: DataTypes.TEXT },
        pe: { type: DataTypes.TEXT },
        col_open: { type: DataTypes.TEXT },
        chartTodayPath: { type: DataTypes.TEXT },
        high: { type: DataTypes.TEXT },
        col_index: { type: DataTypes.TEXT },
        oneWeekAgoVal: { type: DataTypes.TEXT },
        pb: { type: DataTypes.TEXT },
        previousClose: { type: DataTypes.TEXT },
        date365dAgo: { type: DataTypes.TEXT },
        low: { type: DataTypes.TEXT },
        chart30dPath: { type: DataTypes.TEXT },
        dy: { type: DataTypes.TEXT },
        advances: { type: DataTypes.TEXT },
        oneYearAgoVal: { type: DataTypes.TEXT },
        indexSymbol: { type: DataTypes.TEXT },
        variation: { type: DataTypes.TEXT },
        date30dAgo: { type: DataTypes.TEXT },
        perChange30d: { type: DataTypes.TEXT },
        perChange365d: { type: DataTypes.TEXT
        }
      }
        ,
      {
        tableName: 'nse_dynamic',
        timestamps: false
      }
    );
  
    return NseDynamic;
  }