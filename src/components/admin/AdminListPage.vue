<template>
  <div class="list-page">
    <div class="page-head">
      <h1>{{ title }}</h1>
      <p>{{ subtitle }}</p>
    </div>

    <div class="list-card">
      <div class="list-toolbar">
        <label class="list-search">
          <AppIcon name="search" :size="14" />
          <input v-model="keyword" type="text" :placeholder="searchPlaceholder || '搜索...'" />
        </label>
        <span class="list-count">共 {{ filteredRows.length }} / {{ rows.length }} 条</span>
      </div>

      <table class="list-table">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in filteredRows" :key="i">
            <td v-for="col in columns" :key="col.key">
              <span v-if="isTag(row[col.key])" :class="['tag', row[col.key].tag]">
                {{ row[col.key].text }}
              </span>
              <span v-else :class="{ 'cell-strong': col.strong }">{{ row[col.key] }}</span>
            </td>
          </tr>
          <tr v-if="!filteredRows.length">
            <td :colspan="columns.length" class="list-empty">没有匹配的数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import AppIcon from '../AppIcon.vue'

export default {
  name: 'AdminListPage',
  components: { AppIcon },
  props: {
    title: {
      type: String,
      default: ''
    },
    subtitle: {
      type: String,
      default: ''
    },
    columns: {
      type: Array,
      default: () => []
    },
    rows: {
      type: Array,
      default: () => []
    },
    searchKeys: {
      type: Array,
      default: () => []
    },
    searchPlaceholder: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      keyword: ''
    }
  },
  computed: {
    filteredRows() {
      const kw = this.keyword.trim()
      if (!kw) return this.rows
      const keys = this.searchKeys.length ? this.searchKeys : Object.keys(this.rows[0] || {})
      return this.rows.filter(row =>
        keys.some(key => String(row[key] || '').includes(kw))
      )
    }
  },
  methods: {
    // 单元格值为 { text, tag } 时渲染为标签
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

.list-card {
  margin-top: 22px;
  border-radius: 14px;
  background: #fbfcfd;
  border: 1px solid #e4e7ee;
  overflow: hidden;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid #eef0f5;
}

.list-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 280px;
  padding: 7px 12px;
  border-radius: 9px;
  background: #f3f4f8;
  border: 1px solid #e7e9f0;
  color: #8b93a7;
  transition: border-color 0.15s ease;
}

.list-search:focus-within {
  border-color: #5b5bd6;
  background: #fff;
}

.list-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  color: #2a2f3e;
}

.list-search input::placeholder {
  color: #a0a7b8;
}

.list-count {
  font-size: 12px;
  color: #8b93a7;
}

.list-table {
  width: 100%;
  border-collapse: collapse;
}

.list-table th {
  padding: 10px 18px;
  text-align: left;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: #8b93a7;
  background: #f6f7fa;
  border-bottom: 1px solid #eef0f5;
  white-space: nowrap;
}

.list-table td {
  padding: 12px 18px;
  font-size: 13px;
  color: #3a4152;
  border-bottom: 1px solid #f0f1f6;
}

.list-table tbody tr:last-child td {
  border-bottom: none;
}

.list-table tbody tr:hover td {
  background: #f8f9fc;
}

.cell-strong {
  font-weight: 600;
  color: #1d2333;
}

.list-empty {
  text-align: center;
  color: #a0a7b8;
  padding: 32px 18px;
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

.tag.warn {
  color: #a06a1c;
  background: rgba(214, 158, 46, 0.14);
}

.tag.err {
  color: #b23a2b;
  background: rgba(192, 57, 43, 0.1);
}

.tag.off {
  color: #6b7285;
  background: rgba(107, 114, 133, 0.12);
}

.tag.info {
  color: #4a53c0;
  background: rgba(91, 91, 214, 0.1);
}
</style>
