/**
 * 内容配置管理 - 独立于主题设置的网页内容编辑
 */
const ContentSettingsPage = {
    template: `
        <div class="page-container">
            <div class="page-header">
                <h2 class="page-header__title">内容配置</h2>
                <el-button type="primary" :loading="saving" @click="save">保存</el-button>
            </div>

            <div class="card-box" v-loading="loading">
                <h3>首页 Hero 区域</h3>
                <el-form :model="form" label-width="140px" style="max-width: 720px;">
                    <el-form-item label="主标题">
                        <el-input v-model="form.hero_title" placeholder="欢迎来到服务器" />
                    </el-form-item>
                    <el-form-item label="副标题">
                        <el-input v-model="form.hero_subtitle" placeholder="副标题或服务器口号" />
                    </el-form-item>
                    <el-form-item label="描述文字">
                        <el-input v-model="form.hero_description" type="textarea" :rows="2" placeholder="一段简短的介绍" />
                    </el-form-item>
                    <el-form-item label="背景图片">
                        <div style="display:flex;align-items:flex-start;gap:12px;width:100%;">
                            <app-image-upload v-model="form.hero_bg_image" />
                            <el-input v-model="form.hero_bg_image" placeholder="图片路径或URL（建议 1920x1080+）" style="flex:1;" />
                        </div>
                    </el-form-item>
                </el-form>
            </div>

            <div class="card-box" v-loading="loading">
                <h3>服务器概览区域</h3>
                <el-form :model="form" label-width="140px" style="max-width: 720px;">
                    <el-form-item label="区域标题">
                        <el-input v-model="form.section_servers_title" placeholder="服务器状态" />
                    </el-form-item>
                    <el-form-item label="区域描述">
                        <el-input v-model="form.section_servers_description" type="textarea" :rows="2" placeholder="对各服务器的简要介绍" />
                    </el-form-item>
                </el-form>
            </div>

            <div class="card-box" v-loading="loading">
                <h3>图集区域</h3>
                <el-form :model="form" label-width="140px" style="max-width: 720px;">
                    <el-form-item label="区域标题">
                        <el-input v-model="form.section_gallery_title" placeholder="服务器图集" />
                    </el-form-item>
                    <el-form-item label="区域描述">
                        <el-input v-model="form.section_gallery_description" type="textarea" :rows="2" placeholder="展现服务器的精彩瞬间" />
                    </el-form-item>
                </el-form>
            </div>

            <div class="card-box" v-loading="loading">
                <h3>动态区域</h3>
                <el-form :model="form" label-width="140px" style="max-width: 720px;">
                    <el-form-item label="区域标题">
                        <el-input v-model="form.section_news_title" placeholder="服务器动态" />
                    </el-form-item>
                    <el-form-item label="区域描述">
                        <el-input v-model="form.section_news_description" type="textarea" :rows="2" placeholder="了解最新的服务器资讯" />
                    </el-form-item>
                </el-form>
            </div>

            <div class="card-box" v-loading="loading">
                <h3>留言区域</h3>
                <el-form :model="form" label-width="140px" style="max-width: 720px;">
                    <el-form-item label="区域标题">
                        <el-input v-model="form.section_comments_title" placeholder="留言板" />
                    </el-form-item>
                    <el-form-item label="区域描述">
                        <el-input v-model="form.section_comments_description" type="textarea" :rows="2" placeholder="畅所欲言，留下你的想法" />
                    </el-form-item>
                </el-form>
            </div>

            <div class="card-box" v-loading="loading">
                <h3>页脚信息</h3>
                <el-form :model="form" label-width="140px" style="max-width: 720px;">
                    <el-form-item label="页脚描述">
                        <el-input v-model="form.footer_description" type="textarea" :rows="2" placeholder="显示在页脚的描述文字" />
                    </el-form-item>
                    <el-form-item label="ICP 备案号">
                        <el-input v-model="form.icp_number" placeholder="如 京ICP备xxxxxxxx号" />
                    </el-form-item>
                    <el-form-item label="备案号链接">
                        <el-input v-model="form.icp_link" placeholder="如 https://beian.miit.gov.cn/" />
                        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">填写后备案号将显示为可点击链接</div>
                    </el-form-item>
                    <el-form-item label="页脚版权信息">
                        <el-input v-model="form.footer_copyright" placeholder="留空则自动生成" />
                    </el-form-item>
                </el-form>
            </div>

            <div class="card-box" v-loading="loading">
                <h3>自定义代码</h3>
                <el-form :model="form" label-width="140px" style="max-width: 720px;">
                    <el-form-item label="Head 代码">
                        <el-input v-model="form.custom_head_html" type="textarea" :rows="5" placeholder="如统计代码、广告代码等，会注入到页面 &lt;head&gt; 中" />
                    </el-form-item>
                    <el-form-item label="自定义 CSS">
                        <el-input v-model="form.custom_css" type="textarea" :rows="5" placeholder="自定义样式代码，注入到页面 &lt;head&gt;" />
                    </el-form-item>
                </el-form>
            </div>
        </div>
    `,
    setup() {
        const { ref, reactive, onMounted } = Vue
        const loading = ref(false)
        const saving = ref(false)
        const form = reactive({
            hero_title: '',
            hero_subtitle: '',
            hero_description: '',
            hero_bg_image: '',
            section_servers_title: '',
            section_servers_description: '',
            section_gallery_title: '',
            section_gallery_description: '',
            section_news_title: '',
            section_news_description: '',
            section_comments_title: '',
            section_comments_description: '',
            footer_description: '',
            icp_number: '',
            icp_link: '',
            footer_copyright: '',
            custom_head_html: '',
            custom_css: '',
        })

        async function load() {
            loading.value = true
            try {
                const res = await AdminApi.get('/content')
                const d = res.data || {}
                Object.keys(form).forEach((k) => {
                    if (d[k] !== undefined && d[k] !== null) form[k] = d[k]
                })
            } finally {
                loading.value = false
            }
        }

        async function save() {
            saving.value = true
            try {
                await AdminApi.put('/content', { ...form })
                ElementPlus.ElMessage.success('内容已保存')
            } finally {
                saving.value = false
            }
        }

        onMounted(load)
        return { loading, saving, form, save }
    },
}
