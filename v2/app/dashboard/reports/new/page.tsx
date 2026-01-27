"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewReportPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        description: "",
        address: "",
        contactName: "",
        contactPhone: "",
        image: null as File | null,
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, image: file });

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (!formData.image) {
                throw new Error("请上传图片");
            }

            const data = new FormData();
            data.append("description", formData.description);
            data.append("address", formData.address);
            data.append("contactName", formData.contactName || "");
            data.append("contactPhone", formData.contactPhone || "");
            data.append("image", formData.image);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: data,
            });

            if (!response.ok) {
                throw new Error("Failed to create report");
            }

            const result = await response.json();
            router.push(`/dashboard/reports/${result.id}`);
        } catch (err: any) {
            setError(err.message || "创建报告失败，请重试");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b">
                <div className="container mx-auto px-4 py-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        ← 返回
                    </Button>
                </div>
            </nav>

            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <h1 className="text-3xl font-bold mb-6">创建维修报告</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>上传故障照片，AI智能诊断</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    故障照片 *
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                                    {imagePreview ? (
                                        <div className="space-y-4">
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="max-h-64 mx-auto rounded-lg"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setImagePreview(null);
                                                    setFormData({ ...formData, image: null });
                                                }}
                                            >
                                                重新选择
                                            </Button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="text-6xl mb-4">📸</div>
                                            <p className="text-gray-600 mb-4">
                                                点击或拖拽上传故障照片
                                            </p>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="max-w-xs mx-auto"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium mb-2">
                                    问题描述 *
                                </label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={4}
                                    placeholder="请描述遇到的问题，例如：空调不制冷、冰箱有异响等"
                                    required
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium mb-2">
                                    维修地址 *
                                </label>
                                <Input
                                    id="address"
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) =>
                                        setFormData({ ...formData, address: e.target.value })
                                    }
                                    placeholder="请输入详细地址"
                                    required
                                />
                            </div>

                            {/* Contact Info */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="contactName" className="block text-sm font-medium mb-2">
                                        联系人
                                    </label>
                                    <Input
                                        id="contactName"
                                        type="text"
                                        value={formData.contactName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, contactName: e.target.value })
                                        }
                                        placeholder="张先生"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="contactPhone" className="block text-sm font-medium mb-2">
                                        联系电话
                                    </label>
                                    <Input
                                        id="contactPhone"
                                        type="tel"
                                        value={formData.contactPhone}
                                        onChange={(e) =>
                                            setFormData({ ...formData, contactPhone: e.target.value })
                                        }
                                        placeholder="138****8888"
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                    className="flex-1"
                                >
                                    取消
                                </Button>
                                <Button type="submit" disabled={loading} className="flex-1">
                                    {loading ? "AI诊断中..." : "提交并获取AI诊断"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold mb-2">💡 提示</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                        <li>• 照片需清晰显示故障部位</li>
                        <li>• AI将在5-10秒内完成诊断</li>
                        <li>• 诊断后可选择匹配的专业师傅</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
