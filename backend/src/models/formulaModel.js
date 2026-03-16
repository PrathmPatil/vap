/*
---------------------------------------------------
Rally Attempt Day
---------------------------------------------------
*/
export const RallyAttemptDay = (sequelize, DataTypes) => {
  return sequelize.define(
    "RallyAttemptDay",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      symbol: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      rally_date: {
        type: DataTypes.DATEONLY,
      },
      close_price: {
        type: DataTypes.DOUBLE,
      },
      status: {
        type: DataTypes.STRING(100),
      },
    },
    {
      tableName: "ralley_attempt_day",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ fields: ["symbol"] }],
    }
  );
};

/*
---------------------------------------------------
Follow Through Day
---------------------------------------------------
*/
export const FollowThroughDay = (sequelize, DataTypes) => {
  return sequelize.define(
    "FollowThroughDay",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      symbol: {
        type: DataTypes.STRING(255),
      },
      rally_date: {
        type: DataTypes.DATEONLY,
      },
      ftd_date: {
        type: DataTypes.DATEONLY,
      },
      change_percent: {
        type: DataTypes.DOUBLE,
      },
      volume: {
        type: DataTypes.BIGINT,
      },
      status: {
        type: DataTypes.STRING(100),
      },
    },
    {
      tableName: "follow_throught_day",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ fields: ["symbol"] }],
    }
  );
};

/*
---------------------------------------------------
Buy Day
---------------------------------------------------
*/
export const BuyDay = (sequelize, DataTypes) => {
  return sequelize.define(
    "BuyDay",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      symbol: {
        type: DataTypes.STRING(255),
      },
      rally_date: {
        type: DataTypes.DATEONLY,
      },
      ftd_date: {
        type: DataTypes.DATEONLY,
      },
      buy_date: {
        type: DataTypes.DATEONLY,
      },
      breakout_price: {
        type: DataTypes.DOUBLE,
      },
      status: {
        type: DataTypes.STRING(100),
      },
    },
    {
      tableName: "buy_day",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ fields: ["symbol"] }],
    }
  );
};

/*
---------------------------------------------------
Bhavcopy PR Table (Data Source)
---------------------------------------------------
*/
export const BhavcopyPR = (sequelize, DataTypes) => {
  return sequelize.define(
    "BhavcopyPR",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      SECURITY: {
        type: DataTypes.STRING,
      },
      CLOSE_PRICE: {
        type: DataTypes.STRING,
      },
      HIGH_PRICE: {
        type: DataTypes.STRING,
      },
      NET_TRDQTY: {
        type: DataTypes.STRING,
      },
      source_date: {
        type: DataTypes.STRING,
      },
    },
    {
      tableName: "pr",
      timestamps: false,
    }
  );
};