from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from src.agents.plan_agent import plan_agent, study_agent, act_agent
from src.db.session import get_db
from src.models.pdsa import PDSACycle
from src.schemas.pdsa import PDSACycleCreate, PDSACycle as PDSACycleSchema, PDSACycleDo, PDSACycleStudy, PDSACycleAct
from datetime import datetime

router = APIRouter()

class PlanRequest(BaseModel):
    aim: str
    measure: str
    change: str

@router.post("/analyze")
async def analyze_plan(request: PlanRequest):
    """
    Analyzes the initial PDSA questions and returns suggested hypotheses and metrics.
    """
    try:
        initial_state = {
            "aim": request.aim,
            "measure": request.measure,
            "change": request.change,
            "hypotheses": [],
            "suggested_metrics": [],
            "power_analysis": "",
            "errors": []
        }
        
        # Invoke the LangGraph agent
        result = await plan_agent.ainvoke(initial_state)
        
        return {
            "hypotheses": [h.dict() for h in result.get("hypotheses", [])],
            "suggested_metrics": result.get("suggested_metrics", []),
            "power_analysis": result.get("power_analysis", ""),
            "errors": result.get("errors", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save", response_model=PDSACycleSchema)
async def save_pdsa_cycle(cycle_data: PDSACycleCreate, db: AsyncSession = Depends(get_db)):
    """
    Saves a confirmed PDSA cycle plan to the database.
    """
    try:
        new_cycle = PDSACycle(
            aim=cycle_data.aim,
            measure=cycle_data.measure,
            change_idea=cycle_data.change_idea,
            project_id=cycle_data.project_id,
            available_hypotheses=[h.dict() for h in cycle_data.available_hypotheses] if cycle_data.available_hypotheses else [],
            suggested_metrics=cycle_data.suggested_metrics,
            power_analysis=cycle_data.power_analysis,
            selected_hypothesis=cycle_data.selected_hypothesis,
            selected_rationale=cycle_data.selected_rationale,
            user_observations=cycle_data.user_observations,
            status="plan"
        )
        db.add(new_cycle)
        await db.commit()
        await db.refresh(new_cycle)
        return new_cycle
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=List[PDSACycleSchema])
async def list_pdsa_cycles(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all saved PDSA cycles, optionally filtered by project.
    """
    try:
        if project_id:
            result = await db.execute(
                select(PDSACycle)
                .where(PDSACycle.project_id == project_id)
                .order_by(PDSACycle.created_at.desc())
            )
        else:
            result = await db.execute(select(PDSACycle).order_by(PDSACycle.created_at.desc()))
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{cycle_id}/do", response_model=PDSACycleSchema)
async def update_pdsa_do(cycle_id: int, do_data: PDSACycleDo, db: AsyncSession = Depends(get_db)):
    """
    Updates the DO phase of a PDSA cycle.
    """
    try:
        from sqlalchemy import select
        result = await db.execute(select(PDSACycle).where(PDSACycle.id == cycle_id))
        cycle = result.scalar_one_or_none()
        
        if not cycle:
            raise HTTPException(status_code=404, detail="Ciclo PDSA não encontrado")
            
        cycle.do_observations = do_data.do_observations
        cycle.do_data_collected = do_data.do_data_collected
        cycle.do_completed_at = datetime.now()
        cycle.status = "do"
        
        await db.commit()
        await db.refresh(cycle)
        return cycle
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{cycle_id}/study/analyze")
async def analyze_study(cycle_id: int, db: AsyncSession = Depends(get_db)):
    """
    Uses AI to analyze the DO results against the plan.
    """
    try:
        from sqlalchemy import select
        result = await db.execute(select(PDSACycle).where(PDSACycle.id == cycle_id))
        cycle = result.scalar_one_or_none()
        
        if not cycle:
            raise HTTPException(status_code=404, detail="Ciclo não encontrado")
            
        initial_state = {
            "aim": cycle.aim,
            "measure": cycle.measure,
            "change": cycle.change_idea,
            "hypotheses": [{"statement": cycle.selected_hypothesis}],
            "do_observations": cycle.do_observations,
            "do_data_collected": cycle.do_data_collected,
            "errors": []
        }
        
        result = await study_agent.ainvoke(initial_state)
        
        if result.get("errors"):
            raise HTTPException(status_code=500, detail=result["errors"][0])
            
        return {
            "analysis": result["study_analysis"],
            "confirmed": result["study_hypothesis_confirmed"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{cycle_id}/study", response_model=PDSACycleSchema)
async def update_pdsa_study(cycle_id: int, study_data: PDSACycleStudy, db: AsyncSession = Depends(get_db)):
    """
    Finalizes the STUDY phase.
    """
    try:
        from sqlalchemy import select
        result = await db.execute(select(PDSACycle).where(PDSACycle.id == cycle_id))
        cycle = result.scalar_one_or_none()
        
        if not cycle:
            raise HTTPException(status_code=404, detail="Ciclo não encontrado")
            
        cycle.study_analysis = study_data.study_analysis
        cycle.study_hypothesis_confirmed = study_data.study_hypothesis_confirmed
        cycle.study_completed_at = datetime.now()
        cycle.status = "study"
        
        await db.commit()
        await db.refresh(cycle)
        return cycle
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{cycle_id}/act/recommend")
async def recommend_act(cycle_id: int, db: AsyncSession = Depends(get_db)):
    """
    Uses AI to recommend the next strategic move (Adopt, Adapt, Abandon).
    """
    try:
        from sqlalchemy import select
        result = await db.execute(select(PDSACycle).where(PDSACycle.id == cycle_id))
        cycle = result.scalar_one_or_none()
        
        if not cycle:
            raise HTTPException(status_code=404, detail="Ciclo não encontrado")
            
        initial_state = {
            "aim": cycle.aim,
            "measure": cycle.measure,
            "change": cycle.change_idea,
            "hypotheses": [{"statement": cycle.selected_hypothesis}],
            "study_analysis": cycle.study_analysis,
            "study_hypothesis_confirmed": cycle.study_hypothesis_confirmed,
            "errors": []
        }
        
        result = await act_agent.ainvoke(initial_state)
        
        if result.get("errors"):
            raise HTTPException(status_code=500, detail=result["errors"][0])
            
        return {
            "decision": result["act_decision"],
            "reasoning": result["act_notes"],
            "next_steps": result["act_next_steps"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{cycle_id}/act", response_model=PDSACycleSchema)
async def update_pdsa_act(cycle_id: int, act_data: PDSACycleAct, db: AsyncSession = Depends(get_db)):
    """
    Finalizes the ACT phase and the cycle.
    """
    try:
        from sqlalchemy import select
        result = await db.execute(select(PDSACycle).where(PDSACycle.id == cycle_id))
        cycle = result.scalar_one_or_none()
        
        if not cycle:
            raise HTTPException(status_code=404, detail="Ciclo não encontrado")
            
        cycle.act_decision = act_data.act_decision
        cycle.act_notes = act_data.act_notes
        cycle.act_next_steps = act_data.act_next_steps
        cycle.act_completed_at = datetime.now()
        cycle.status = "act"
        
        await db.commit()
        await db.refresh(cycle)
        return cycle
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{cycle_id}")
async def delete_pdsa_cycle(cycle_id: int, db: AsyncSession = Depends(get_db)):
    """
    Deletes a PDSA cycle if it's not yet concluded (status is not 'act').
    """
    try:
        from sqlalchemy import select
        result = await db.execute(select(PDSACycle).where(PDSACycle.id == cycle_id))
        cycle = result.scalar_one_or_none()
        
        if not cycle:
            raise HTTPException(status_code=404, detail="Ciclo não encontrado")
            
        if cycle.status == "act":
            raise HTTPException(status_code=400, detail="Não é possível excluir um ciclo concluído.")
            
        await db.delete(cycle)
        await db.commit()
        return {"message": "Ciclo excluído com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{cycle_id}/reset/do", response_model=PDSACycleSchema)
async def reset_pdsa_do(cycle_id: int, db: AsyncSession = Depends(get_db)):
    """
    Resets the DO phase of a cycle, moving it back to 'plan' status.
    """
    try:
        from sqlalchemy import select
        result = await db.execute(select(PDSACycle).where(PDSACycle.id == cycle_id))
        cycle = result.scalar_one_or_none()
        
        if not cycle:
            raise HTTPException(status_code=404, detail="Ciclo não encontrado")
            
        if cycle.status == "act":
            raise HTTPException(status_code=400, detail="Não é possível resetar um ciclo concluído.")
            
        cycle.do_observations = None
        cycle.do_data_collected = None
        cycle.do_completed_at = None
        cycle.status = "plan"
        
        await db.commit()
        await db.refresh(cycle)
        return cycle
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{cycle_id}/reset/study", response_model=PDSACycleSchema)
async def reset_pdsa_study(cycle_id: int, db: AsyncSession = Depends(get_db)):
    """
    Resets the STUDY phase of a cycle, moving it back to 'do' status.
    """
    try:
        from sqlalchemy import select
        result = await db.execute(select(PDSACycle).where(PDSACycle.id == cycle_id))
        cycle = result.scalar_one_or_none()
        
        if not cycle:
            raise HTTPException(status_code=404, detail="Ciclo não encontrado")
            
        if cycle.status == "act":
            raise HTTPException(status_code=400, detail="Não é possível resetar um ciclo concluído.")
            
        cycle.study_analysis = None
        cycle.study_hypothesis_confirmed = None
        cycle.study_completed_at = None
        cycle.status = "do"
        
        await db.commit()
        await db.refresh(cycle)
        return cycle
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
