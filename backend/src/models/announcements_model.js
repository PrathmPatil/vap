export default (sequelize, DataTypes) => {
  const Announcements = sequelize.define(
    'announcements',
    {
      ATTACHMENTNAME: { type: DataTypes.TEXT },
      XML_NAME: { type: DataTypes.TEXT },
      TotalPageCnt: { type: DataTypes.TEXT },
      SCRIP_CD: { type: DataTypes.TEXT },
      DissemDT: { type: DataTypes.TEXT },
      NEWS_DT: { type: DataTypes.TEXT },
      DT_TM: { type: DataTypes.TEXT },
      AUDIO_VIDEO_FILE: { type: DataTypes.TEXT },
      SUBCATNAME: { type: DataTypes.TEXT },
      AGENDA_ID: { type: DataTypes.TEXT },
      RN: { type: DataTypes.TEXT },
      HEADLINE: { type: DataTypes.TEXT },
      News_submission_dt: { type: DataTypes.TEXT },
      NEWSSUB: { type: DataTypes.TEXT },
      ANNOUNCEMENT_TYPE: { type: DataTypes.TEXT },
      MORE: { type: DataTypes.TEXT },
      NSURL: { type: DataTypes.TEXT },
      PDFFLAG: { type: DataTypes.TEXT },
      QUARTER_ID: { type: DataTypes.TEXT },
      CRITICALNEWS: { type: DataTypes.TEXT },
      NEWSID: { type: DataTypes.TEXT },
      FILESTATUS: { type: DataTypes.TEXT },
      OLD: { type: DataTypes.TEXT },
      Fld_Attachsize: { type: DataTypes.TEXT },
      TimeDiff: { type: DataTypes.TEXT },
      CATEGORYNAME: { type: DataTypes.TEXT },
      SLONGNAME: { type: DataTypes.TEXT }
    },
    {
      tableName: 'announcements',
      timestamps: false
    }
  );

  return Announcements;
};
