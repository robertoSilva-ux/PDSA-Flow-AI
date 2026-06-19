from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.db.base_class import Base

class PDSACycle(Base):
    __tablename__ = "pdsacycle"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    
    project = relationship("Project", backref="cycles")
    
    # Model for Improvement Questions
    aim = Column(Text, nullable=False)
    measure = Column(Text, nullable=False)
    change_idea = Column(Text, nullable=False)
    
    # AI Suggestions
    available_hypotheses = Column(JSON) # List of generated hypotheses
    suggested_metrics = Column(JSON)
    power_analysis = Column(Text)
    
    # Selected & Refined
    selected_hypothesis = Column(Text)
    selected_rationale = Column(Text)
    user_observations = Column(Text)
    
    # DO Phase
    do_observations = Column(Text)
    do_data_collected = Column(Text)
    do_completed_at = Column(DateTime(timezone=True))
    
    # STUDY Phase
    study_analysis = Column(Text)
    study_hypothesis_confirmed = Column(String) # 'yes', 'no', 'partial'
    study_completed_at = Column(DateTime(timezone=True))
    
    # ACT Phase
    act_decision = Column(String) # 'adopt', 'adapt', 'abandon'
    act_notes = Column(Text)
    act_next_steps = Column(Text)
    act_completed_at = Column(DateTime(timezone=True))
    
    # Metadata
    status = Column(String, default="plan") # plan, do, study, act
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
