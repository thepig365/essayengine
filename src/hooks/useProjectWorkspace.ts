"use client";

import { useEffect, useState } from "react";
import {
  createProject,
  deleteProject,
  duplicateProject,
  getActiveProjectId,
  getProjects,
  loadProject,
  saveProject,
  type SavedEssayEngineProject,
  type SavedEssayEngineProjectState,
} from "@/lib/projectStorage";

type UseProjectWorkspaceParams = {
  currentProjectState: () => SavedEssayEngineProjectState;
  applyProjectState: (state: SavedEssayEngineProjectState) => void;
  clearWorkspaceState: () => void;
  autosaveDeps: unknown[];
};

export function useProjectWorkspace({
  currentProjectState,
  applyProjectState,
  clearWorkspaceState,
  autosaveDeps,
}: UseProjectWorkspaceParams) {
  const [projects, setProjects] = useState<SavedEssayEngineProject[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState("");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [projectHydrated, setProjectHydrated] = useState(false);

  function refreshProjectList(activeId?: string) {
    const nextProjects = getProjects();
    setProjects(nextProjects);
    if (activeId) setActiveProjectIdState(activeId);
  }

  function saveCurrentProject(statusMessage = "Project saved.", options: { silent?: boolean } = {}) {
    const existing = activeProjectId ? loadProject(activeProjectId) : null;
    const baseProject = existing ?? createProject(projectName.trim() || "Untitled Project");
    const project = saveProject({
      id: baseProject.id,
      name: projectName.trim() || "Untitled Project",
      updatedAt: baseProject.updatedAt,
      state: currentProjectState(),
    });
    setActiveProjectIdState(project.id);
    setProjectName(project.name);
    refreshProjectList(project.id);
    if (!options.silent) setProjectStatus(statusMessage);
  }

  function clearWorkspace() {
    clearWorkspaceState();
    setProjectStatus("Workspace cleared.");
  }

  function loadSelectedProject(id: string) {
    const project = loadProject(id);
    if (!project) return;
    setActiveProjectIdState(project.id);
    setProjectName(project.name);
    applyProjectState(project.state);
    refreshProjectList(project.id);
    setProjectStatus("Project loaded.");
  }

  function duplicateCurrentProject() {
    if (!activeProjectId) return;
    saveCurrentProject("Project saved.", { silent: true });
    const project = duplicateProject(activeProjectId);
    if (!project) return;
    setActiveProjectIdState(project.id);
    setProjectName(project.name);
    applyProjectState(project.state);
    refreshProjectList(project.id);
    setProjectStatus("Project duplicated.");
  }

  function deleteCurrentProject() {
    if (!activeProjectId) return;
    const nextProjects = deleteProject(activeProjectId);
    setProjects(nextProjects);
    const nextProject = nextProjects[0];
    if (nextProject) {
      setActiveProjectIdState(nextProject.id);
      setProjectName(nextProject.name);
      applyProjectState(nextProject.state);
    } else {
      const project = createProject("Untitled Project");
      setActiveProjectIdState(project.id);
      setProjectName(project.name);
      applyProjectState(project.state);
      refreshProjectList(project.id);
    }
    setProjectStatus("Project deleted.");
  }

  useEffect(() => {
    const storedProjects = getProjects();
    const activeId = getActiveProjectId();
    const activeProject = activeId ? storedProjects.find((project) => project.id === activeId) : storedProjects[0];
    if (activeProject) {
      setProjects(storedProjects);
      setActiveProjectIdState(activeProject.id);
      setProjectName(activeProject.name);
      applyProjectState(activeProject.state);
    } else {
      const project = createProject("Untitled Project");
      setProjects(getProjects());
      setActiveProjectIdState(project.id);
      setProjectName(project.name);
    }
    setProjectHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!projectHydrated || !activeProjectId) return;
    const timer = window.setTimeout(() => {
      saveCurrentProject("Project saved.", { silent: true });
    }, 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectHydrated, activeProjectId, projectName, ...autosaveDeps]);

  return {
    projects,
    activeProjectId,
    projectName,
    setProjectName,
    projectStatus,
    setProjectStatus,
    projectHydrated,
    refreshProjectList,
    saveCurrentProject,
    clearWorkspace,
    loadSelectedProject,
    duplicateCurrentProject,
    deleteCurrentProject,
  };
}
