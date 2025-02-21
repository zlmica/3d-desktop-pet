import { createRouter, createWebHashHistory } from "vue-router";
import Home from "../views/Home.vue";
import ReminderPopup from "../views/ReminderPopup.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/task",
    name: "Task",
    component: () => import("../views/TodoView.vue"),
  },
  {
    path: "/reminder",
    name: "Reminder",
    component: () => import("../views/ReminderView.vue"),
  },
  {
    path: "/reminder-popup",
    name: "reminder-popup",
    component: ReminderPopup,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
