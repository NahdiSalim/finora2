import { CONFIG } from "src/config-global";
import TaskDetailsView from "src/sections/collaborator/task-management/task-details/index";

export default function TaskDetailsPage() {
  return (
    <>
      <title>{`Task Details - ${CONFIG.appName}`}</title>
      <TaskDetailsView />
    </>
  );
}
