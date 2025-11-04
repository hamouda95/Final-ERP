import React, { useState, useEffect } from 'react';
import { useCartStore } from '../store';
import { productsAPI, clientsAPI, ordersAPI, invoicesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { TrashIcon, PlusIcon, MinusIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Cart() {
  const { items, selectedStore, selectedClient, setSelectedStore, setSelectedClient, addItem, removeItem, updateQuantity, clearCart, getTotal, getTotalHT } = useCartStore();
  
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [loading, setLoading] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [installments, setInstallments] = useState(1);

  useEffect(() => {
    loadProducts();
    loadClients();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll({ is_visible: true });
      setProducts(response.data.results || response.data);
    } catch (error) {
      toast.error('Erreur de chargement des produits');
    }
  };

  const loadClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      setClients(response.data.results || response.data);
    } catch (error) {
      toast.error('Erreur de chargement des clients');
    }
  };

  const handleCheckout = async () => {
    if (!selectedClient) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    if (items.length === 0) {
      toast.error('Le panier est vide');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        client: selectedClient.id,
        store: selectedStore,
        items: items.map((item) => ({
          product: item.product.id,
          quantity: item.quantity,
          unit_price_ht: item.product.price_ht,
          unit_price_ttc: item.product.price_ttc,
          tva_rate: item.product.tva_rate,
        })),
        payment_method: paymentMethod,
        installments: paymentMethod === 'installment' ? installments : 1,
      };

      const orderResponse = await ordersAPI.create(orderData);
      const order = orderResponse.data;

      await invoicesAPI.generatePDF(order.invoice.id);
      
      toast.success('Commande créée avec succès !');
      
      const pdfBlob = await invoicesAPI.downloadPDF(order.invoice.id);
      const url = window.URL.createObjectURL(new Blob([pdfBlob.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_${order.invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      clearCart();
      setSearchProduct('');
      setPaymentMethod('cash');
      setInstallments(1);
      
    } catch (error) {
      toast.error('Erreur lors de la création de la commande');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.reference.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const totalTTC = getTotal();
  const totalHT = getTotalHT();
  const totalTVA = totalTTC - totalHT;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sélection des produits */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sélection du magasin */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Magasin de vente</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedStore('ville_avray')}
                className={`p-4 rounded-lg border-2 font-semibold transition ${
                  selectedStore === 'ville_avray'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Ville d'Avray
              </button>
              <button
                onClick={() => setSelectedStore('garches')}
                className={`p-4 rounded-lg border-2 font-semibold transition ${
                  selectedStore === 'garches'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Garches
              </button>
            </div>
          </div>

          {/* Recherche produits */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ajouter des produits</h2>
            <input
              type="text"
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                  onClick={() => addItem(product)}
                >
                  <div>
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">Réf: {product.reference} • Stock: {product.total_stock}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{product.price_ttc} €</p>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Ajouter</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panier et récapitulatif */}
        <div className="space-y-6">
          {/* Sélection client */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Client</h2>
            {selectedClient ? (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="font-semibold text-gray-900">{selectedClient.full_name}</p>
                <p className="text-sm text-gray-600">{selectedClient.email}</p>
                <p className="text-sm text-gray-600">{selectedClient.phone}</p>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Changer de client
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setShowClientModal(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-600 hover:text-blue-600 font-semibold transition"
                >
                  + Sélectionner un client existant
                </button>
                <button
                  onClick={() => setShowCreateClientModal(true)}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  + Créer un nouveau client
                </button>
              </div>
            )}
          </div>

          {/* Panier */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Panier ({items.length})</h2>
            
            {items.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Panier vide</p>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">{item.product.name}</p>
                      <p className="text-xs text-gray-600">{item.product.price_ttc} €</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                        className="p-1 bg-white rounded hover:bg-gray-100"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-1 bg-white rounded hover:bg-gray-100"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Moyen de paiement */}
            {items.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-3">Moyen de paiement</h3>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
                >
                  <option value="cash">Espèces</option>
                  <option value="card">Carte bancaire</option>
                  <option value="check">Chèque</option>
                  <option value="sumup">SumUp</option>
                  <option value="installment">Paiement en plusieurs fois</option>
                </select>

                {paymentMethod === 'installment' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de mensualités
                    </label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="2">2 fois ({(totalTTC / 2).toFixed(2)} € x 2)</option>
                      <option value="3">3 fois ({(totalTTC / 3).toFixed(2)} € x 3)</option>
                      <option value="4">4 fois ({(totalTTC / 4).toFixed(2)} € x 4)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Total */}
            {items.length > 0 && (
              <div className="mt-6 pt-6 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sous-total HT</span>
                  <span className="font-semibold">{totalHT.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">TVA</span>
                  <span className="font-semibold">{totalTVA.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total TTC</span>
                  <span className="text-blue-600">{totalTTC.toFixed(2)} €</span>
                </div>
              </div>
            )}

            {/* Bouton validation */}
            <button
              onClick={handleCheckout}
              disabled={loading || items.length === 0 || !selectedClient}
              className="w-full mt-6 bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Traitement...' : 'Valider la vente'}
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      {showClientModal && (
        <ClientSelectionModal
          clients={clients}
          onSelect={(client) => {
            setSelectedClient(client);
            setShowClientModal(false);
          }}
          onClose={() => setShowClientModal(false)}
        />
      )}

      {showCreateClientModal && (
        <CreateClientModal
          onSave={(newClient) => {
            setSelectedClient(newClient);
            loadClients();
            setShowCreateClientModal(false);
          }}
          onClose={() => setShowCreateClientModal(false)}
        />
      )}
    </div>
  );
}

function ClientSelectionModal({ clients, onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter((c) =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Sélectionner un client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email ou téléphone..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
          />
        </div>
        <div className="overflow-y-auto max-h-96 px-6 pb-6 space-y-2">
          {filteredClients.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelect(client)}
              className="w-full text-left p-4 hover:bg-gray-50 rounded-lg transition border border-gray-200"
            >
              <p className="font-semibold text-gray-900">{client.full_name || `${client.first_name} ${client.last_name}`}</p>
              <p className="text-sm text-gray-600">{client.email} • {client.phone}</p>
            </button>
          ))}
          {filteredClients.length === 0 && (
            <p className="text-center text-gray-500 py-8">Aucun client trouvé</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateClientModal({ onSave, onClose }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await clientsAPI.create(formData);
      toast.success('Client créé avec succès');
      onSave(response.data);
    } catch (error) {
      toast.error('Erreur lors de la création du client');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Nouveau client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prénom *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code postal</label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer le client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}