<script setup>
import { computed } from "vue";

const props = defineProps({
  completed: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
});

// 计算进度条缩放比例，题目总数为零时保持进度条为空。
const progressScale = computed(function getProgressScale() {
  if (!props.total) return 0;
  return props.completed / props.total;
});
</script>

<template>
  <div class="quiz-toolbar">
    <div>
      <strong aria-label="答题进度">{{ completed }} / {{ total }}</strong>
    </div>
    <div class="quiz-progress" aria-hidden="true">
      <i :style="{ transform: `scaleX(${progressScale})` }"></i>
    </div>
    <div class="quiz-score" aria-label="当前得分" aria-live="polite">
      <strong>{{ score }}</strong
      ><small>分</small>
    </div>
  </div>
</template>
