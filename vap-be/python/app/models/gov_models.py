# app/models/gov_models.py
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, func
from app.db import Base

class BaseNewsMixin:
    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    link = Column(Text, nullable=True)
    pub_date = Column(String(100), nullable=True)
    raw_json = Column(Text, nullable=True)
    article_hash = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

def make_model(name):
    # helper to create a table class with dynamic name
    return type(
        name,
        (Base, BaseNewsMixin),
        {"__tablename__": name.lower()}
    )

NewsOnAir = make_model("news_on_air")
PibMinistry = make_model("pib_ministry")
PibNews = make_model("pib_news")
DdNews = make_model("dd_news")
