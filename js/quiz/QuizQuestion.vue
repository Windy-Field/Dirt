<script setup>
import { computed } from "vue";

const props = defineProps({
  question: { type: Object, required: true },
  index: { type: Number, required: true },
  selectedAnswer: { type: String, default: "" },
  selectedQuestionId: { type: [String, Number], default: null },
  answerResult: { type: Object, default: null },
  correctDisplayKey: { type: String, default: "" },
  answered: { type: Boolean, default: false },
});

// 只显示当前题的判题结果，防止切题时上一题的异步结果短暂闪现。
const currentAnswerResult = computed(function getCurrentAnswerResult() {
  if (!props.answerResult || String(props.answerResult.questionId) !== String(props.question.id)) return null;
  return props.answerResult;
});

// 根据判题结果生成提示文字，避免在模板中写多层条件表达式。
const answerSummary = computed(function getAnswerSummary() {
  if (!currentAnswerResult.value) return "";
  if (currentAnswerResult.value.correct) {
    return `回答正确，答案 ${props.correctDisplayKey}，本题获得 ${currentAnswerResult.value.earnedScore} 分`;
  }
  return `回答错误，正确答案是 ${props.correctDisplayKey}`;
});

const emit = defineEmits(["update:selectedAnswer"]);

function choose(optionKey) {
  if (currentAnswerResult.value) return;
  emit("update:selectedAnswer", optionKey);
}
</script>

<template>
  <fieldset
    class="quiz-question"
    :class="{
      'is-correct': currentAnswerResult && currentAnswerResult.correct,
      'is-wrong': currentAnswerResult && !currentAnswerResult.correct,
    }"
  >
    <legend class="sr-only">第 {{ index + 1 }} 题：{{ question.question }}</legend>
    <div class="quiz-question-title">
      <span class="quiz-question-number">{{ String(index + 1).padStart(2, "0") }}</span>
      <span class="quiz-difficulty" :data-difficulty="question.difficulty || '简单'">{{
        question.difficulty || "简单"
      }}</span>
      <h3>
        {{ question.question }}<span v-if="answered" class="quiz-analysis-hint">【下滑查看详细解析】</span>
      </h3>
    </div>
    <div class="quiz-options" :class="{ 'has-long-option': question.hasLongOption }">
      <button
        v-for="option in question.displayOptions"
        :key="`${question.renderId}-${option.displayId}`"
        class="quiz-option"
        type="button"
        role="radio"
        :aria-checked="
          String(selectedQuestionId) === String(question.id) && selectedAnswer === option.originalKey
        "
        :disabled="Boolean(currentAnswerResult)"
        :class="{
          'is-selected':
            String(selectedQuestionId) === String(question.id) && selectedAnswer === option.originalKey,
          'is-answer': currentAnswerResult && option.originalKey === currentAnswerResult.correctAnswer,
        }"
        @click="choose(option.originalKey)"
      >
        <span
          class="quiz-option-pulse"
          :class="{
            'is-selected-pulse':
              String(selectedQuestionId) === String(question.id) && selectedAnswer === option.originalKey,
            'is-answer-pulse':
              currentAnswerResult && option.originalKey === currentAnswerResult.correctAnswer,
          }"
          aria-hidden="true"
        ></span>
        <span class="quiz-option-key">{{ option.displayKey }}</span
        ><span>{{ option.text }}</span>
      </button>
    </div>
    <Transition name="quiz-reveal">
      <div v-if="currentAnswerResult" class="quiz-explanation">
        <strong>{{ answerSummary }}</strong>
        <p>{{ currentAnswerResult.explanation }}</p>
      </div>
    </Transition>
  </fieldset>
</template>
