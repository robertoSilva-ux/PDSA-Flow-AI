from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class HypothesisSchema(BaseModel):
    statement: str
    rationale: str
    confidence: float

class PDSACycleBase(BaseModel):
    aim: str
    measure: str
    change_idea: str
    project_id: Optional[int] = None
    available_hypotheses: Optional[List[HypothesisSchema]] = None
    suggested_metrics: Optional[List[str]] = None
    power_analysis: Optional[str] = None
    selected_hypothesis: Optional[str] = None
    selected_rationale: Optional[str] = None
    user_observations: Optional[str] = None
    
    # DO Phase
    do_observations: Optional[str] = None
    do_data_collected: Optional[str] = None
    do_completed_at: Optional[datetime] = None
    
    # STUDY Phase
    study_analysis: Optional[str] = None
    study_hypothesis_confirmed: Optional[str] = None
    study_completed_at: Optional[datetime] = None
    
    # ACT Phase
    act_decision: Optional[str] = None
    act_notes: Optional[str] = None
    act_next_steps: Optional[str] = None
    act_completed_at: Optional[datetime] = None

class PDSACycleCreate(PDSACycleBase):
    pass

class PDSACycleDo(BaseModel):
    do_observations: str
    do_data_collected: Optional[str] = None

class PDSACycleStudy(BaseModel):
    study_analysis: str
    study_hypothesis_confirmed: str

class PDSACycleAct(BaseModel):
    act_decision: str
    act_notes: str
    act_next_steps: Optional[str] = None

class PDSACycle(PDSACycleBase):
    id: int
    project_id: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
