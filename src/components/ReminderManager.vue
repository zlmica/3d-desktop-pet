<script setup lang="ts">

import { useReminder } from '../composable/useReminder'

const { reminderQueue, acknowledgeReminder } = useReminder()
</script>

<template>
    <div class="fixed left-0 top-0 z-99 flex flex-col-reverse gap-4">
        <TransitionGroup name="reminder">
            <div v-for="reminder in reminderQueue" :key="reminder.id"
                class="bg-white rounded-lg shadow-lg p-4 w-[180px]  animate-slide-in">
                <div class="flex justify-between items-start mb-2 w-[160px]">
                    <h3 class="truncate">{{ reminder.title }}</h3>
                    <span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full mr-2">
                        {{ new Date(reminder.currentReminderTime!).toLocaleTimeString([], {
                            hour: '2-digit', minute:
                                '2-digit'
                        }) }}
                    </span>
                </div>

                <p class="text-gray-600 text-sm mb-4 truncate w-full">{{ reminder.description }}</p>

                <button @click="acknowledgeReminder(reminder)"
                    class="w-[60px] bg-blue-500 text-white py-1 rounded text-sm hover:bg-blue-600 transition-colors">
                    知道了
                </button>
            </div>
        </TransitionGroup>
    </div>
</template>

<style scoped>
.reminder-enter-active,
.reminder-leave-active {
    transition: all 0.3s ease;
}

.reminder-enter-from {
    opacity: 0;
    transform: translateX(30px);
}

.reminder-leave-to {
    opacity: 0;
    transform: translateX(30px);
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(30px);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.animate-slide-in {
    animation: slideIn 0.3s ease-out;
}
</style>