import React, { useState, useEffect } from "react";
import { ArrowLeft as ArrowBack, Save, CloudUpload, Trash2 as Delete, Plus as Add } from "lucide-react";
import axios from "axios";
import { useLanguage } from "../../context/LanguageContext";

const ProductForm = ({ deviceId, product, device, otherProducts = [], onCancel, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    category: "",
    inventoryType: "always_in_stock",
    stockCount: 0,
    pricing: { raw: 0, currency: "IDR", formatted: "", promo: null },
    images: [],
    variants: [],
    relations: { upsell: [], related: [] },
    tags: []
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (product) {
       // Deep copy to avoid reference issues
       setFormData(JSON.parse(JSON.stringify(product)));
    }
  }, [product]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePriceChange = (field, value) => {
    setFormData(prev => ({
       ...prev,
       pricing: { ...prev.pricing, [field]: value }
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploading(true);
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        if (device?.userId) formData.append("userId", device.userId);
        formData.append("isPublic", "true");

        const res = await axios.post("/api/whatsapp/files/upload", formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        });
        return { url: res.data.url, caption: "" };
      });

      const newImages = await Promise.all(uploadPromises);
      setFormData(prev => ({ 
        ...prev, 
        images: [...prev.images, ...newImages] 
      }));
    } catch (error) {
       console.error("Upload failed", error);
       alert(t('products.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
      setFormData(prev => ({
          ...prev,
          images: prev.images.filter((_, i) => i !== index)
      }));
  };

  const handleSubmit = async () => {
     try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const url = `/api/whatsapp/devices/${deviceId}/products` + (product ? `/${product.id}` : "");
        const method = product ? "put" : "post";

        await axios[method](url, formData, {
           headers: { Authorization: `Bearer ${token}` }
        });

        setLoading(false);
        onSave();
     } catch (err) {
        console.error("Save failed", err);
        setLoading(false);
        alert(t('products.saveFailed'));
     }
  };

  const handleRelationChange = (type, productId) => {
      const currentList = formData.relations[type] || [];
      const newList = currentList.includes(productId) 
          ? currentList.filter(id => id !== productId)
          : [...currentList, productId];
      
      setFormData(prev => ({
          ...prev,
          relations: { ...prev.relations, [type]: newList }
      }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <ArrowBack className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {product ? t('products.editProduct') : t('products.addNewProduct')}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
             <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('products.basicInfo')}</h2>
             <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products.productName')}</label>
                    <input 
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent dark:text-white"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products.description')}</label>
                    <textarea 
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none bg-transparent dark:text-white"
                        value={formData.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        placeholder={t('products.description')}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('products.userNote')}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products.sku')}</label>
                        <input 
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent dark:text-white"
                            value={formData.sku}
                            onChange={(e) => handleChange("sku", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products.category')}</label>
                        <input 
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent dark:text-white"
                            value={formData.category}
                            onChange={(e) => handleChange("category", e.target.value)}
                        />
                    </div>
                 </div>
             </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
             <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('products.pricingInventory')}</h2>
             <div className="grid grid-cols-3 gap-4 mb-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products.priceNumeric')}</label>
                    <input 
                        type="number"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent dark:text-white"
                        value={formData.pricing.raw}
                        onChange={(e) => handlePriceChange("raw", parseFloat(e.target.value))}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products.currency')}</label>
                    <input 
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent dark:text-white"
                        value={formData.pricing.currency}
                        onChange={(e) => handlePriceChange("currency", e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products.display')}</label>
                    <input 
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent dark:text-white"
                        value={formData.pricing.formatted}
                        onChange={(e) => handlePriceChange("formatted", e.target.value)}
                        placeholder="e.g. Rp 50rb"
                    />
                 </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products.inventoryStrategy')}</label>
                    <select 
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent dark:text-white dark:bg-gray-700"
                        value={formData.inventoryType}
                        onChange={(e) => handleChange("inventoryType", e.target.value)}
                    >
                        <option value="always_in_stock">{t('products.alwaysInStock')}</option>
                        <option value="manage_stock">{t('products.trackQuantity')}</option>
                        <option value="unavailable">{t('products.unavailable')}</option>
                    </select>
                 </div>
                 {formData.inventoryType === "manage_stock" && (
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products.quantity')}</label>
                        <input 
                            type="number"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-transparent dark:text-white"
                            value={formData.stockCount}
                            onChange={(e) => handleChange("stockCount", parseInt(e.target.value))}
                        />
                     </div>
                 )}
             </div>
          </div>

          {/* Variants */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('products.variants')}</h2>
                <button 
                    onClick={() => setFormData(prev => ({...prev, variants: [...prev.variants, { name: "", priceAdjustment: 0 }] }))}
                    className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-md flex items-center gap-1 transition-colors"
                >
                    <Add className="w-4 h-4" /> {t('products.add')}
                </button>
             </div>
             
             {formData.variants.map((variant, idx) => (
                <div key={idx} className="flex gap-4 mb-2 items-center">
                   <div className="flex-1">
                      <input 
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-transparent dark:text-white"
                          placeholder={t('products.variantNamePlaceholder')}
                          value={variant.name}
                          onChange={(e) => {
                             const newVariants = [...formData.variants];
                             newVariants[idx].name = e.target.value;
                             setFormData({...formData, variants: newVariants});
                          }}
                      />
                   </div>
                   <div className="w-1/3">
                      <input 
                          type="number"
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-transparent dark:text-white"
                          placeholder={t('products.priceAdjustment')}
                          value={variant.priceAdjustment}
                          onChange={(e) => {
                             const newVariants = [...formData.variants];
                             newVariants[idx].priceAdjustment = parseFloat(e.target.value) || 0;
                             setFormData({...formData, variants: newVariants});
                          }}
                      />
                   </div>
                   <button 
                      onClick={() => setFormData(prev => ({...prev, variants: prev.variants.filter((_, i) => i !== idx)}))}
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg"
                   >
                      <Delete className="w-4 h-4" />
                   </button>
                </div>
             ))}
             {formData.variants.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-2">{t('products.noVariants')}</p>
             )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="md:col-span-1 space-y-6">
           {/* Images */}
           <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('products.images')}</h2>
              <label className="block bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition relative">
                 <input 
                   type="file" 
                   multiple 
                   accept="image/*" 
                   className="hidden" 
                   onChange={handleImageUpload}
                   disabled={uploading}
                 />
                 <CloudUpload className={`w-8 h-8 text-gray-400 mx-auto mb-2 ${uploading ? 'animate-bounce' : ''}`} />
                 <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {uploading ? t('products.uploading') : t('products.uploadImages')}
                 </p>
              </label>
              
              <div className="mt-4 space-y-2">
                  {formData.images.map((img, idx) => (
                     <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
                        <img src={img.url} className="w-10 h-10 object-cover rounded-md" />
                        <div className="flex-1 min-w-0">
                           <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{img.caption || t('products.productImage')}</p>
                        </div>
                        <button onClick={() => handleRemoveImage(idx)} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                           <Delete className="w-4 h-4" />
                        </button>
                     </div>
                  ))}
              </div>
           </div>

           {/* AI Strategy */}
           <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('products.aiStrategy')}</h2>
              <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products.tags')}</label>
                 <input 
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-transparent dark:text-white"
                    placeholder={t('products.addTagPlaceholder')}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                       if (e.key === 'Enter' && tagInput.trim()) {
                          e.preventDefault();
                          setFormData(prev => ({...prev, tags: [...prev.tags, tagInput.trim()]}));
                          setTagInput("");
                       }
                    }}
                 />
                 <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, i) => (
                       <span key={i} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                          {tag}
                          <button onClick={() => setFormData(prev => ({...prev, tags: prev.tags.filter((_, idx) => idx !== i)}))} className="hover:text-blue-900 dark:hover:text-blue-100">×</button>
                       </span>
                    ))}
                 </div>
              </div>
           </div>

           {/* Relations (Simplified) */}
           <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('products.relationships')}</h2>
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('products.upsell')}</label>
                      <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 space-y-1">
                          {otherProducts.map(p => (
                              <label key={p.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                                  <input 
                                      type="checkbox"
                                      checked={formData.relations.upsell.includes(p.id)}
                                      onChange={() => handleRelationChange("upsell", p.id)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-transparent dark:bg-gray-700 dark:border-gray-500"
                                  />
                                  <span className="truncate">{p.name}</span>
                              </label>
                          ))}
                          {otherProducts.length === 0 && <p className="text-xs text-gray-400">{t('products.noOtherProducts')}</p>}
                      </div>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('products.related')}</label>
                      <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 space-y-1">
                          {otherProducts.map(p => (
                              <label key={p.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                                  <input 
                                      type="checkbox"
                                      checked={formData.relations.related.includes(p.id)}
                                      onChange={() => handleRelationChange("related", p.id)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-transparent dark:bg-gray-700 dark:border-gray-500"
                                  />
                                  <span className="truncate">{p.name}</span>
                              </label>
                          ))}
                       </div>
                  </div>
              </div>
           </div>

        </div>
      </div>
      
      <div className="flex justify-end gap-3 mt-8 pb-12">
         <button 
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
         >
            {t('cancel')}
         </button>
         <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
         >
            <Save className="w-4 h-4" />
            {loading ? t('products.saving') : t('products.saveProduct')}
         </button>
      </div>
    </div>
  );
};

export default ProductForm;

