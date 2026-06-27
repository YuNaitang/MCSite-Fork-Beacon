/**
 * 多服务器配置管理
 */
const ServersConfigPage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">服务器列表</h2>
                <div style="display:flex;gap:8px;">
                    <el-button :loading="loading" @click="loadServers">
                        <el-icon><Refresh /></el-icon>刷新
                    </el-button>
                    <el-button type="primary" @click="openAddDialog">
                        <el-icon><Plus /></el-icon>添加服务器
                    </el-button>
                </div>
            </div>

            <div class="card-box" v-loading="loading">
                <el-table v-if="!store.isMobile" :data="servers" stripe style="width:100%;">
                    <el-table-column type="index" label="#" width="50" />
                    <el-table-column prop="server_name" label="名称" min-width="140" />
                    <el-table-column prop="host" label="地址" width="160">
                        <template #default="{ row }">
                            <code style="font-size:12px;">{{ row.host }}:{{ row.port }}</code>
                        </template>
                    </el-table-column>
                    <el-table-column prop="protocol" label="协议" width="90">
                        <template #default="{ row }">
                            <el-tag :type="row.protocol === 'java' ? 'primary' : 'success'" size="small">
                                {{ row.protocol === 'java' ? 'Java' : '基岩' }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="display_order" label="排序" width="70" />
                    <el-table-column prop="is_displayed" label="状态" width="80">
                        <template #default="{ row }">
                            <el-tag :type="row.is_displayed ? 'success' : 'info'" size="small">
                                {{ row.is_displayed ? '显示' : '隐藏' }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="180" fixed="right">
                        <template #default="{ row }">
                            <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
                            <el-button size="small" type="danger" @click="confirmDelete(row)">删除</el-button>
                        </template>
                    </el-table-column>
                </el-table>

                <!-- 移动端卡片视图 -->
                <div v-else class="mobile-list">
                    <div v-for="s in servers" :key="s.id" class="mobile-card">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong>{{ s.server_name }}</strong>
                            <el-tag :type="s.is_displayed ? 'success' : 'info'" size="small">
                                {{ s.is_displayed ? '显示' : '隐藏' }}
                            </el-tag>
                        </div>
                        <div style="font-size:13px;color:var(--text-muted);margin:6px 0;">
                            <code>{{ s.host }}:{{ s.port }}</code>
                            <span style="margin-left:8px;">{{ s.protocol === 'java' ? 'Java' : '基岩' }}</span>
                        </div>
                        <div style="display:flex;gap:8px;margin-top:8px;">
                            <el-button size="small" @click="openEditDialog(s)">编辑</el-button>
                            <el-button size="small" type="danger" @click="confirmDelete(s)">删除</el-button>
                        </div>
                    </div>
                </div>

                <div v-if="!servers.length && !loading" style="text-align:center;padding:48px;color:var(--text-muted);">
                    <el-icon style="font-size:40px;margin-bottom:12px;"><Server /></el-icon>
                    <p>暂无服务器，点击上方添加</p>
                </div>
            </div>

            <!-- 添加/编辑对话框 -->
            <el-dialog v-model="dialogVisible" :title="isEditing ? '编辑服务器' : '添加服务器'" width="520px" align-center>
                <el-form ref="formRef" :model="editForm" :rules="rules" label-width="120px">
                    <el-form-item label="服务器名称" prop="server_name">
                        <el-input v-model="editForm.server_name" placeholder="例如：生存服、小游戏服" />
                    </el-form-item>
                    <el-form-item label="主机地址" prop="host">
                        <el-input v-model="editForm.host" placeholder="IP 或域名" />
                    </el-form-item>
                    <el-form-item label="游戏端口" prop="port">
                        <el-input-number v-model="editForm.port" :min="1" :max="65535" />
                    </el-form-item>
                    <el-form-item label="Query 端口">
                        <el-input-number v-model="editForm.query_port" :min="1" :max="65535" :controls="true" />
                        <span style="margin-left:8px;color:var(--text-muted);font-size:12px;">留空则与游戏端口相同</span>
                    </el-form-item>
                    <el-form-item label="协议类型" prop="protocol">
                        <el-radio-group v-model="editForm.protocol">
                            <el-radio label="java">Java 版</el-radio>
                            <el-radio label="bedrock">基岩版</el-radio>
                        </el-radio-group>
                    </el-form-item>
                    <el-form-item label="排序权重">
                        <el-input-number v-model="editForm.display_order" :min="0" :max="999" />
                        <span style="margin-left:8px;color:var(--text-muted);font-size:12px;">数字越小越靠前</span>
                    </el-form-item>
                    <el-form-item label="前台展示">
                        <el-switch v-model="editForm.is_displayed" />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="dialogVisible = false">取消</el-button>
                    <el-button type="primary" :loading="dialogSaving" @click="saveDialog">保存</el-button>
                </template>
            </el-dialog>
        </div>
    `,
    setup() {
        const { ref, reactive, onMounted } = Vue
        const store = AdminStore
        const loading = ref(false)
        const servers = ref([])

        const dialogVisible = ref(false)
        const dialogSaving = ref(false)
        const isEditing = ref(false)
        const editingId = ref(null)
        const formRef = ref(null)

        const editForm = reactive({
            server_name: '',
            host: '',
            port: 25565,
            query_port: null,
            protocol: 'java',
            display_order: 0,
            is_displayed: true,
        })

        const rules = {
            server_name: [{ required: true, message: '请输入服务器名称', trigger: 'blur' }],
            host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
            port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
            protocol: [{ required: true, message: '请选择协议', trigger: 'change' }],
        }

        async function loadServers() {
            loading.value = true
            try {
                const res = await AdminApi.get('/servers/config')
                servers.value = res.data || []
            } finally {
                loading.value = false
            }
        }

        function resetForm() {
            editForm.server_name = ''
            editForm.host = ''
            editForm.port = 25565
            editForm.query_port = null
            editForm.protocol = 'java'
            editForm.display_order = 0
            editForm.is_displayed = true
        }

        function openAddDialog() {
            isEditing.value = false
            editingId.value = null
            resetForm()
            dialogVisible.value = true
        }

        function openEditDialog(server) {
            isEditing.value = true
            editingId.value = server.id
            editForm.server_name = server.server_name || ''
            editForm.host = server.host || ''
            editForm.port = server.port != null ? Number(server.port) : 25565
            editForm.query_port = server.query_port != null && server.query_port !== '' ? Number(server.query_port) : null
            editForm.protocol = server.protocol || 'java'
            editForm.display_order = server.display_order != null ? Number(server.display_order) : 0
            editForm.is_displayed = !!server.is_displayed
            dialogVisible.value = true
        }

        async function saveDialog() {
            await formRef.value?.validate?.()
            dialogSaving.value = true
            try {
                const payload = {
                    server_name: editForm.server_name,
                    host: editForm.host,
                    port: editForm.port,
                    query_port: editForm.query_port,
                    protocol: editForm.protocol,
                    display_order: editForm.display_order,
                    is_displayed: editForm.is_displayed,
                }

                if (isEditing.value && editingId.value) {
                    await AdminApi.put('/servers/config/' + editingId.value, payload)
                    ElementPlus.ElMessage.success('已更新')
                } else {
                    await AdminApi.post('/servers/config', payload)
                    ElementPlus.ElMessage.success('已添加')
                }

                dialogVisible.value = false
                await loadServers()
            } finally {
                dialogSaving.value = false
            }
        }

        async function confirmDelete(server) {
            try {
                await ElementPlus.ElMessageBox.confirm(
                    `确定删除服务器「${server.server_name}」？相关状态日志不会被删除。`,
                    '确认删除',
                    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
                )
                await AdminApi.delete('/servers/config/' + server.id)
                ElementPlus.ElMessage.success('已删除')
                await loadServers()
            } catch (_) { /* 取消 */ }
        }

        onMounted(loadServers)
        return {
            store, loading, servers,
            dialogVisible, dialogSaving, isEditing, formRef, editForm, rules,
            loadServers, openAddDialog, openEditDialog, saveDialog, confirmDelete,
        }
    },
}
