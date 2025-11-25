// mysql> desc companies;
// +---------------+--------------+------+-----+---------+----------------+
// | Field         | Type         | Null | Key | Default | Extra          |
// +---------------+--------------+------+-----+---------+----------------+
// | id            | int          | NO   | PRI | NULL    | auto_increment |
// | symbol        | varchar(20)  | YES  | UNI | NULL    |                |
// | name          | varchar(255) | YES  |     | NULL    |                |
// | sector        | varchar(255) | YES  |     | NULL    |                |
// | industry      | varchar(255) | YES  |     | NULL    |                |
// | currency      | varchar(10)  | YES  |     | NULL    |                |
// | exchange      | varchar(50)  | YES  |     | NULL    |                |
// | marketCap     | bigint       | YES  |     | NULL    |                |
// | currentPrice  | float        | YES  |     | NULL    |                |
// | previousClose | float        | YES  |     | NULL    |                |
// | change        | float        | YES  |     | NULL    |                |
// | changePercent | float        | YES  |     | NULL    |                |
// | volume        | bigint       | YES  |     | NULL    |                |
// | high52Week    | float        | YES  |     | NULL    |                |
// | low52Week     | float        | YES  |     | NULL    |                |
// | beta          | float        | YES  |     | NULL    |                |
// | dividendYield | float        | YES  |     | NULL    |                |
// | forwardPE     | float        | YES  |     | NULL    |                |
// | trailingPE    | float        | YES  |     | NULL    |                |
// | website       | varchar(255) | YES  |     | NULL    |                |
// | addedAt       | datetime     | YES  |     | NULL    |                |
// +---------------+--------------+------+-----+---------+----------------+
// 21 rows in set (0.03 sec)


export default function YFinanceCompaniesModel(sequelize, DataTypes) {
    return sequelize.define(
        'companies',
        {
            id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
            symbol: { type: DataTypes.STRING(20), allowNull: false, unique: true },
            name: { type: DataTypes.STRING(255), allowNull: true },
            sector: { type: DataTypes.STRING(255), allowNull: true },
            industry: { type: DataTypes.STRING(255), allowNull: true },
            currency: { type: DataTypes.STRING(10), allowNull: true },
            exchange: { type: DataTypes.STRING(50), allowNull: true },
            marketCap: { type: DataTypes.BIGINT, allowNull: true },
            currentPrice: { type: DataTypes.FLOAT, allowNull: true },
            previousClose: { type: DataTypes.FLOAT, allowNull: true },
            change: { type: DataTypes.FLOAT, allowNull: true },
            changePercent: { type: DataTypes.FLOAT, allowNull: true },
            volume: { type: DataTypes.BIGINT, allowNull: true },            
            high52Week: { type: DataTypes.FLOAT, allowNull: true },
            low52Week: { type: DataTypes.FLOAT, allowNull: true },
            beta: { type: DataTypes.FLOAT, allowNull: true },
            dividendYield: { type: DataTypes.FLOAT, allowNull: true },
            forwardPE: { type: DataTypes.FLOAT, allowNull: true },
            trailingPE: { type: DataTypes.FLOAT, allowNull: true },
            website: { type: DataTypes.STRING(255), allowNull: true },            
            addedAt: { type: DataTypes.DATE, allowNull: true },
        },
        {
    timestamps: false, // 🚀 disables createdAt & updatedAt
    tableName: "companies",
  }
    );
}