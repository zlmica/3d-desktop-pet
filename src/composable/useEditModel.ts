import { ref } from 'vue'

const isEdit = ref(false)

export const useEditModel = () => {
  const editModel = () => {
    isEdit.value = true
  }

  const closeEditModel = () => {
    isEdit.value = false
  }

  return {
    isEdit,
    editModel,
    closeEditModel,
  }
}
