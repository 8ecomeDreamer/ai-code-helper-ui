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
        <div class="list-toolbar-right">
          <span class="list-count">共 {{ filteredRows.length }} / {{ displayRows.length }} 条</span>
          <button v-if="resource" class="btn btn-ghost" type="button" :disabled="loading" @click="loadRows">
            {{ loading ? '加载中...' : '刷新' }}
          </button>
          <button v-if="canCreate" class="btn btn-primary" type="button" @click="openCreate">+ 新增</button>
        </div>
      </div>

      <!-- 后端加载错误提示 -->
      <div v-if="loadError" class="list-error">
        数据加载失败：{{ loadError }}
        <button class="btn btn-ghost btn-sm" type="button" @click="loadRows">重试</button>
      </div>

      <table class="list-table">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
            <th v-if="hasActions" class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in filteredRows" :key="rowKey(row, i)">
            <td v-for="col in columns" :key="col.key">
              <span v-if="isTag(row[col.key])" :class="['tag', row[col.key].tag]">
                {{ row[col.key].text }}
              </span>
              <span v-else :class="{ 'cell-strong': col.strong }">{{ row[col.key] }}</span>
            </td>
            <td v-if="hasActions" class="col-actions">
              <button v-if="canEdit" class="link-btn" type="button" @click="openEdit(row)">编辑</button>
              <button v-if="canDelete" class="link-btn link-danger" type="button" @click="removeRow(row)">删除</button>
            </td>
          </tr>
          <tr v-if="!filteredRows.length">
            <td :colspan="columns.length + (hasActions ? 1 : 0)" class="list-empty">
              {{ loading ? '加载中...' : '没有匹配的数据' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新增 / 编辑弹窗 -->
    <div v-if="showForm" class="modal-mask" @click.self="closeForm">
      <div class="modal">
        <div class="modal-head">
          <h3>{{ formMode === 'create' ? '新增' : '编辑' }}{{ title }}</h3>
          <button class="modal-close" type="button" @click="closeForm">×</button>
        </div>
        <div class="modal-body">
          <div v-for="field in formFields" :key="field.key" class="form-item">
            <label class="form-label">
              {{ field.label }}<span v-if="field.required" class="req">*</span>
            </label>
            <textarea
              v-if="field.type === 'textarea'"
              v-model="formValues[field.key]"
              class="form-input"
              rows="4"
            />
            <select v-else-if="field.type === 'select'" v-model="formValues[field.key]" class="form-input">
              <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <input
              v-else
              v-model="formValues[field.key]"
              class="form-input"
              :type="field.type === 'number' ? 'number' : 'text'"
              :step="field.type === 'number' ? 'any' : null"
            />
          </div>
          <div v-if="formError" class="form-error">{{ formError }}</div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" type="button" :disabled="submitting" @click="closeForm">取消</button>
          <button class="btn btn-primary" type="button" :disabled="submitting" @click="submitForm">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AppIcon from '../AppIcon.vue'

export default {
  name: 'AdminListPage',
  components: { AppIcon },
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    columns: { type: Array, default: () => [] },
    // 静态演示数据（无 resource 时使用）
    rows: { type: Array, default: () => [] },
    searchKeys: { type: Array, default: () => [] },
    searchPlaceholder: { type: String, default: '' },
    // 后端资源（adminApi.buildResource 产物）；提供后从接口拉取数据
    resource: { type: Object, default: null },
    // 后端记录 -> 表格行 的映射函数（应包含展示字段，并可带 __id / __raw 隐藏键）
    rowMapper: { type: Function, default: null },
    // 表单字段定义：[{ key, label, type, required, options }]
    formFields: { type: Array, default: () => [] },
    // 表单值 + 原始记录 -> 提交负载 的映射函数
    payloadMapper: { type: Function, default: null },
    // 主键字段名（无 __id 时回退使用）
    idKey: { type: String, default: 'id' },
    canCreate: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false }
  },
  data() {
    return {
      keyword: '',
      localRows: null,
      loading: false,
      loadError: '',
      showForm: false,
      formMode: 'create',
      formValues: {},
      editingRaw: null,
      formError: '',
      submitting: false
    }
  },
  computed: {
    // 表格实际渲染的数据源
    displayRows() {
      if (this.resource) {
        const items = this.localRows || []
        return this.rowMapper ? items.map(this.rowMapper) : items
      }
      return this.rows
    },
    filteredRows() {
      const kw = this.keyword.trim()
      if (!kw) return this.displayRows
      const keys = this.searchKeys.length ? this.searchKeys : Object.keys(this.displayRows[0] || {})
      return this.displayRows.filter(row =>
        keys.some(key => this.cellText(row[key]).includes(kw))
      )
    },
    hasActions() {
      return !!this.resource && (this.canEdit || this.canDelete)
    }
  },
  watch: {
    // 路由复用同一组件实例时，切换资源需重新加载
    resource() {
      this.keyword = ''
      this.localRows = null
      this.loadError = ''
      this.loadRows()
    }
  },
  mounted() {
    this.loadRows()
  },
  methods: {
    // 单元格文本（标签对象取 text）
    cellText(value) {
      if (value && typeof value === 'object' && value.text !== undefined) return String(value.text)
      return String(value == null ? '' : value)
    },
    rowKey(row, index) {
      if (row && row.__id != null) return row.__id
      if (row && row[this.idKey] != null) return row[this.idKey]
      return index
    },
    isTag(value) {
      return !!value && typeof value === 'object' && value.text !== undefined
    },
    async loadRows() {
      if (!this.resource) return
      this.loading = true
      this.loadError = ''
      try {
        const data = await this.resource.list()
        this.localRows = Array.isArray(data) ? data : []
      } catch (error) {
        this.loadError = error.message || '加载失败'
        this.localRows = []
      } finally {
        this.loading = false
      }
    },
    emptyForm() {
      const form = {}
      this.formFields.forEach(field => {
        if (field.default !== undefined) {
          form[field.key] = field.default
        } else {
          form[field.key] = field.type === 'number' ? null : ''
        }
      })
      return form
    },
    formFromRaw(raw) {
      const form = {}
      this.formFields.forEach(field => {
        const value = raw ? raw[field.key] : null
        form[field.key] = value == null ? (field.type === 'number' ? null : '') : value
      })
      return form
    },
    openCreate() {
      this.formMode = 'create'
      this.editingRaw = null
      this.formValues = this.emptyForm()
      this.formError = ''
      this.showForm = true
    },
    openEdit(row) {
      this.formMode = 'edit'
      this.editingRaw = row.__raw || row
      this.formValues = this.formFromRaw(this.editingRaw)
      this.formError = ''
      this.showForm = true
    },
    closeForm() {
      if (this.submitting) return
      this.showForm = false
    },
    async submitForm() {
      for (const field of this.formFields) {
        const value = this.formValues[field.key]
        if (field.required && (value === '' || value == null)) {
          this.formError = `${field.label}不能为空`
          return
        }
      }
      this.formError = ''
      const payload = this.payloadMapper
        ? this.payloadMapper({ ...this.formValues }, this.editingRaw)
        : { ...(this.editingRaw || {}), ...this.formValues }
      this.submitting = true
      try {
        if (this.formMode === 'create') {
          await this.resource.create(payload)
        } else {
          await this.resource.update(payload)
        }
        this.showForm = false
        await this.loadRows()
      } catch (error) {
        this.formError = error.message || '保存失败'
      } finally {
        this.submitting = false
      }
    },
    async removeRow(row) {
      const id = row.__id != null ? row.__id : row[this.idKey]
      if (id == null) return
      if (!window.confirm('确认删除该记录？此操作不可撤销。')) return
      try {
        await this.resource.remove(id)
        await this.loadRows()
      } catch (error) {
        this.loadError = error.message || '删除失败'
      }
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

.list-toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
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

.list-error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  font-size: 12.5px;
  color: #b23a2b;
  background: rgba(192, 57, 43, 0.06);
  border-bottom: 1px solid #eef0f5;
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

.col-actions {
  width: 130px;
  white-space: nowrap;
}

.link-btn {
  border: none;
  background: transparent;
  color: #4a53c0;
  font-size: 12.5px;
  cursor: pointer;
  padding: 2px 6px;
}

.link-btn:hover {
  text-decoration: underline;
}

.link-danger {
  color: #b23a2b;
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

/* 按钮 */
.btn {
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  padding: 7px 14px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #5b5bd6;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #4a4ac4;
}

.btn-ghost {
  background: #fff;
  border-color: #dfe2ea;
  color: #4a53c0;
}

.btn-ghost:hover:not(:disabled) {
  border-color: #5b5bd6;
}

.btn-sm {
  padding: 3px 10px;
  font-size: 11.5px;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 24, 38, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: 460px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 80px);
  overflow: auto;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(20, 24, 38, 0.24);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eef0f5;
}

.modal-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1d2333;
}

.modal-close {
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  color: #8b93a7;
  cursor: pointer;
}

.modal-body {
  padding: 18px 20px;
}

.form-item {
  margin-bottom: 14px;
}

.form-label {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: #3a4152;
  margin-bottom: 6px;
}

.req {
  color: #b23a2b;
  margin-left: 3px;
}

.form-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 11px;
  border-radius: 8px;
  border: 1px solid #dfe2ea;
  font-size: 13px;
  color: #2a2f3e;
  outline: none;
  transition: border-color 0.15s ease;
  font-family: inherit;
}

.form-input:focus {
  border-color: #5b5bd6;
}

.form-error {
  margin-top: 6px;
  font-size: 12.5px;
  color: #b23a2b;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #eef0f5;
}
</style>
