// models/news.model.js
import { Sequelize, DataTypes } from 'sequelize';

// DB_NEWS=news_data_fastapi
// DB_NEWS_USER=root
// DB_NEWS_PASS=Patil@2000
// DB_NEWS_HOST=127.0.0.1
// DB_NEWS_DIALECT=mysql
const sequelize = new Sequelize(
  process.env.DB_NEWS,
  process.env.DB_NEWS_USER,
  process.env.DB_NEWS_PASS,
  {
    host: process.env.DB_NEWS_HOST,
    dialect: process.env.DB_NEWS_DIALECT || 'mysql',
    logging: false
  }
);

// DB_BSE_INDICES
// const bse_indices= new Sequelize(
//   process.env.DB_BSE_INDICES,
//   process.env.DB_BSE_INDICES_USER,
//   process.env.DB_BSE_INDICES_PASS,
//   {
//     host: process.env.DB_BSE_INDICES_HOST,
//     dialect: process.env.DB_BSE_INDICES_DIALECT || 'mysql',
//     logging: false
//   }
// );


const db = {};

/* ----------------------------------------
   NEWS ON AIR TABLE
----------------------------------------- */
db.NewsOnAir = sequelize.define(
  'news_on_air',
  {
    __typename: { type: DataTypes.TEXT },
    body: { type: DataTypes.TEXT },
    image: { type: DataTypes.TEXT },
    news_category: { type: DataTypes.TEXT },
    source: { type: DataTypes.TEXT },
    title: { type: DataTypes.TEXT },
    updatedAt: { type: DataTypes.TEXT },
    updatedAtEpoch: { type: DataTypes.TEXT },
    url: { type: DataTypes.TEXT }
  },
  { tableName: 'news_on_air', timestamps: false }
);

/* ----------------------------------------
   PIB MINISTRY TABLE
----------------------------------------- */
db.PibMinistry = sequelize.define(
  'pib_ministry',
  {
    __typename: { type: DataTypes.TEXT },
    ministry_id: { type: DataTypes.TEXT },
    title: { type: DataTypes.TEXT }
  },
  { tableName: 'pib_ministry', timestamps: false }
);

/* ----------------------------------------
   PIB NEWS TABLE
----------------------------------------- */
db.PibNews = sequelize.define(
  'pib_news',
  {
    __typename: { type: DataTypes.TEXT },
    createdAt: { type: DataTypes.TEXT },
    ministry_title: { type: DataTypes.TEXT },
    npiMinistry: { type: DataTypes.TEXT },
    source: { type: DataTypes.TEXT },
    title: { type: DataTypes.TEXT },
    updatedAt: { type: DataTypes.TEXT },
    updatedAtEpoch: { type: DataTypes.TEXT },
    url: { type: DataTypes.TEXT }
  },
  { tableName: 'pib_news', timestamps: false }
);

/* ----------------------------------------
   DD NEWS TABLE
----------------------------------------- */
db.DdNews = sequelize.define(
  'dd_news',
  {
    __typename: { type: DataTypes.TEXT },
    createdAt: { type: DataTypes.TEXT },
    image: { type: DataTypes.TEXT },
    news_category: { type: DataTypes.TEXT },
    source: { type: DataTypes.TEXT },
    title: { type: DataTypes.TEXT },
    updatedAt: { type: DataTypes.TEXT },
    url: { type: DataTypes.TEXT }
  },
  { tableName: 'dd_news', timestamps: false }
);

db.sequelize = sequelize;

export default db;
