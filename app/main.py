# from fastapi import FastAPI

# from .db import Base, engine
# from .routers.expenses import router as expenses_router

# # Create tables on startup (simple approach for this course project)
# Base.metadata.create_all(bind=engine)

# app = FastAPI(title="ExpenseTracker Lite")


# @app.get("/health")
# def health():
#     """
#     Simple health check used in the demo & video.
#     """
#     return {"ok": True}


# app.include_router(expenses_router)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from .routers.expenses import router as expenses_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ExpenseTracker Lite")

# 👇 allow your Next dev server to talk to FastAPI
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(expenses_router)
