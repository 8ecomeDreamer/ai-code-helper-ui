<template>
  <div class="settings-page">
    <div class="page-head">
      <h1>{{ title }}</h1>
      <p>{{ subtitle }}</p>
    </div>

    <div class="config-list">
      <div v-for="card in cards" :key="card.title" class="config-card">
        <div class="config-head">
          <div class="config-title">{{ card.title }}</div>
          <div class="config-desc">{{ card.desc }}</div>
        </div>
        <div class="config-tiles">
          <div v-for="item in card.items" :key="item.label" class="config-tile">
            <div class="tile-label">{{ item.label }}</div>
            <div class="tile-value">
              <span v-if="isTag(item.value)" :class="['tag', item.value.tag]">{{ item.value.text }}</span>
              <span v-else>{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdminSettings',
  props: {
    title: {
      type: String,
      default: ''
    },
    subtitle: {
      type: String,
      default: ''
    },
    cards: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    isTag(value) {
      return !!value && typeof value === 'object' && value.text !== undefined
    }
  }
}
</script>

<style scoped>
.page-head h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #1d2333;
}

.page-head p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #8b93a7;
}

.config-list {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-card {
  border-radius: 14px;
  background: #fbfcfd;
  border: 1px solid #e4e7ee;
  overflow: hidden;
}

.config-head {
  padding: 18px 20px 14px;
}

.config-title {
  font-size: 15px;
  font-weight: 700;
  color: #1d2333;
}

.config-desc {
  margin-top: 5px;
  font-size: 12.5px;
  color: #8b93a7;
}

.config-tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 4px 20px 20px;
}

.config-tile {
  padding: 14px 16px;
  border-radius: 10px;
  background: #f6f7fa;
  border: 1px solid #e7e9f0;
}

.tile-label {
  font-size: 12px;
  color: #8b93a7;
}

.tile-value {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1d2333;
  word-break: break-all;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.tag.ok {
  color: #2f7a55;
  background: rgba(58, 125, 93, 0.12);
}

@media (max-width: 1100px) {
  .config-tiles {
    grid-template-columns: 1fr;
  }
}
</style>
