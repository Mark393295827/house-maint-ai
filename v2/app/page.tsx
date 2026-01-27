import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <nav className="border-b bg-white/80 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-blue-600">House Maint AI</h1>
                    <div className="space-x-4">
                        <Link href="/login">
                            <Button variant="ghost">登录</Button>
                        </Link>
                        <Link href="/register">
                            <Button>注册</Button>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-4 py-20">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        AI驱动的智能家维平台
                    </h2>
                    <p className="text-xl text-gray-600">
                        为物业公司和业主提供专业的家电维修诊断与师傅匹配服务
                    </p>

                    <div className="grid md:grid-cols-3 gap-6 mt-12">
                        <div className="p-6 bg-white rounded-lg shadow-lg">
                            <div className="text-4xl mb-4">📸</div>
                            <h3 className="text-xl font-semibold mb-2">AI智能诊断</h3>
                            <p className="text-gray-600">
                                拍照上传，AI自动识别问题并给出维修建议
                            </p>
                        </div>

                        <div className="p-6 bg-white rounded-lg shadow-lg">
                            <div className="text-4xl mb-4">👨‍🔧</div>
                            <h3 className="text-xl font-semibold mb-2">专业师傅匹配</h3>
                            <p className="text-gray-600">
                                智能匹配附近评分最高的专业维修师傅
                            </p>
                        </div>

                        <div className="p-6 bg-white rounded-lg shadow-lg">
                            <div className="text-4xl mb-4">🏢</div>
                            <h3 className="text-xl font-semibold mb-2">B2B管理平台</h3>
                            <p className="text-gray-600">
                                为物业公司提供批量订单管理与数据分析
                            </p>
                        </div>
                    </div>

                    <div className="mt-12 space-x-4">
                        <Link href="/register">
                            <Button size="lg" className="text-lg px-8">
                                立即开始
                            </Button>
                        </Link>
                        <Link href="/b2b">
                            <Button size="lg" variant="outline" className="text-lg px-8">
                                企业版
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="border-t bg-gray-50 mt-20">
                <div className="container mx-auto px-4 py-8 text-center text-gray-600">
                    <p>© 2026 House Maint AI. Powered by AI Agents.</p>
                </div>
            </footer>
        </div>
    );
}
