from pydantic import BaseModel

class AddGroupMember(BaseModel):
    user_id: int
