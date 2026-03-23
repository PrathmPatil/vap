/*
---------------------------------------------------
Rally Attempt Day
---------------------------------------------------
*/
export const RallyAttemptDay = (sequelize, DataTypes) => {
  return sequelize.define(
    'RallyAttemptDay',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      symbol: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      rally_date: {
        type: DataTypes.DATEONLY
      },
      close_price: {
        type: DataTypes.DOUBLE
      },
      status: {
        type: DataTypes.STRING(100)
      }
    },
    {
      tableName: 'ralley_attempt_day',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['symbol'] }]
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
    'FollowThroughDay',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      symbol: {
        type: DataTypes.STRING(255)
      },
      rally_date: {
        type: DataTypes.DATEONLY
      },
      ftd_date: {
        type: DataTypes.DATEONLY
      },
      change_percent: {
        type: DataTypes.DOUBLE
      },
      volume: {
        type: DataTypes.BIGINT
      },
      status: {
        type: DataTypes.STRING(100)
      }
    },
    {
      tableName: 'follow_throught_day',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['symbol'] }]
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
    'BuyDay',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      symbol: {
        type: DataTypes.STRING(255)
      },
      rally_date: {
        type: DataTypes.DATEONLY
      },
      ftd_date: {
        type: DataTypes.DATEONLY
      },
      buy_date: {
        type: DataTypes.DATEONLY
      },
      breakout_price: {
        type: DataTypes.DOUBLE
      },
      status: {
        type: DataTypes.STRING(100)
      }
    },
    {
      tableName: 'buy_day',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['symbol'] }]
    }
  );
};

/*
---------------------------------------------------
Strong Bullish Candle
---------------------------------------------------
*/

export const StrongBullishCandle = (sequelize, DataTypes) => {
  return sequelize.define(
    'StrongBullishCandle',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      security: {
        type: DataTypes.STRING(255)
      },
      open_price: {
        type: DataTypes.DOUBLE
      },
      close_price: {
        type: DataTypes.DOUBLE
      },
      change_percent: {
        type: DataTypes.DOUBLE
      },
      trade_date: {
        type: DataTypes.DATEONLY
      }
    },
    {
      tableName: 'strong_bullish_candle',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['security', 'trade_date'] }]
    }
  );
};
