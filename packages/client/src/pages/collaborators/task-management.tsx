import { useLocation } from "react-router-dom";
import { CONFIG } from "src/config-global";
import TaskManagementView from "src/sections/collaborator/task-management/index";

export default function TaskManagementPage() {
  const location = useLocation();
  const isMesTasks =
    location.pathname.includes("/tasks") &&
    !location.pathname.includes("/task-management");
  const pageTitle = isMesTasks ? "Mes tâches" : "Gestion des tâches";

  return (
    <>
      <title>{`${pageTitle} - ${CONFIG.appName}`}</title>
      <TaskManagementView />
    </>
  );
}
