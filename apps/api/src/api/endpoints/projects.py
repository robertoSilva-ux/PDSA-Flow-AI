from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List
from src.db.session import get_db
from src.models.project import Project
from src.models.pdsa import PDSACycle
from src.schemas.project import ProjectCreate, ProjectUpdate, Project as ProjectSchema

router = APIRouter()

@router.post("/", response_model=ProjectSchema, status_code=201)
async def create_project(project_data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    """Creates a new project."""
    try:
        new_project = Project(
            name=project_data.name,
            description=project_data.description
        )
        db.add(new_project)
        await db.commit()
        await db.refresh(new_project)
        
        # Count cycles (will be 0)
        result = await db.execute(
            select(func.count(PDSACycle.id)).where(PDSACycle.project_id == new_project.id)
        )
        new_project.cycle_count = result.scalar() or 0
        
        return new_project
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[ProjectSchema])
async def list_projects(db: AsyncSession = Depends(get_db)):
    """Lists all projects with cycle counts."""
    try:
        result = await db.execute(select(Project).order_by(Project.created_at.desc()))
        projects = result.scalars().all()
        
        # Attach cycle counts
        projects_list = []
        for p in projects:
            count_result = await db.execute(
                select(func.count(PDSACycle.id)).where(PDSACycle.project_id == p.id)
            )
            p.cycle_count = count_result.scalar() or 0
            projects_list.append(p)
        
        return projects_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{project_id}", response_model=ProjectSchema)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Gets a single project."""
    try:
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        count_result = await db.execute(
            select(func.count(PDSACycle.id)).where(PDSACycle.project_id == project.id)
        )
        project.cycle_count = count_result.scalar() or 0
        
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{project_id}", response_model=ProjectSchema)
async def update_project(project_id: int, project_data: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    """Updates a project."""
    try:
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        if project_data.name is not None:
            project.name = project_data.name
        if project_data.description is not None:
            project.description = project_data.description
        
        await db.commit()
        await db.refresh(project)
        
        count_result = await db.execute(
            select(func.count(PDSACycle.id)).where(PDSACycle.project_id == project.id)
        )
        project.cycle_count = count_result.scalar() or 0
        
        return project
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Deletes a project and all its cycles."""
    try:
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        # Delete all cycles of this project
        await db.execute(
            PDSACycle.__table__.delete().where(PDSACycle.project_id == project_id)
        )
        await db.delete(project)
        await db.commit()
        
        return {"message": "Projeto e ciclos excluídos com sucesso"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
