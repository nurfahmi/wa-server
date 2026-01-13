import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, Trash2 as Delete, Plus as Add, ArrowLeft as ArrowBack, Package as Inventory, Search } from "lucide-react";
import ProductForm from "./ProductForm";
import axios from "axios";
import { useLanguage } from "../../context/LanguageContext";

const ProductManager = () => {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [device, setDevice] = useState(null);
  // const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list, form, detail
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [productsRes, deviceRes] = await Promise.all([
        axios.get(`/api/whatsapp/devices/${deviceId}/products`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { search }
        }),
        axios.get(`/api/whatsapp/devices/${deviceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setProducts(productsRes.data.products);
      setDevice(deviceRes.data.device);
      // setLoading(false);
    } catch (err) {
      console.error("Failed to fetch data", err);
      // setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [deviceId, search]);

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setView("form");
  };

  const handleDelete = async (productId) => {
    if (!window.confirm(t('products.deleteConfirm'))) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/whatsapp/devices/${deviceId}/products/${productId}`, {
         headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert(t('products.deleteFailed'));
    }
  };

  const handleSave = () => {
    setView("list");
    fetchData();
  };

  if (view === "form") {
    return (
      <ProductForm 
        deviceId={deviceId} 
        product={selectedProduct} 
        device={device}
        otherProducts={products.filter(p => !selectedProduct || p.id !== selectedProduct.id)}
        onCancel={() => setView("list")}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <ArrowBack className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('products.title')}</h1>
        </div>
        <button 
          onClick={() => { setSelectedProduct(null); setView("form"); }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Add className="w-5 h-5" />
          {t('products.addProduct')}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
        <div className="p-4">
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
            <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input 
              type="text" 
              placeholder={t('products.searchPlaceholder')} 
              className="bg-transparent w-full outline-none text-gray-700 dark:text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('products.productName')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('products.price')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('products.stock')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('products.variants')}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider text-right">{t('products.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0].url} alt={p.name} className="w-12 h-12 rounded-lg object-cover border border-gray-100 dark:border-gray-600" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                           <Inventory className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{p.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {p.pricing?.formatted || `${p.pricing?.currency || ""} ${p.pricing?.raw || 0}`}
                  </td>
                  <td className="px-6 py-4">
                     {p.inventoryType === 'always_in_stock' ? (
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold inline-flex items-center">
                           {t('products.inStock')}
                        </span>
                     ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center ${p.stockCount > 0 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                           {p.stockCount} {t('products.units')}
                        </span>
                     )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                     {p.variants?.length > 0 ? p.variants.map(v => v.name).join(", ") : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => handleEdit(p)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                          <Delete className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-gray-400 dark:text-gray-500">
                    <Inventory className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">{t('products.noProducts')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductManager;

