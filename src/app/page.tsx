'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OrdemServico {
  id: number;
  usuario_nome: string;
  usuario_telefone: string;
  local_atendimento?: string;
  equipamento?: string;
  anydesk?: string;
  problema: string;
  status: string;
  tecnico_responsavel?: string;
  prioridade: number;
  setor: string;
  created_at: string;
  updated_at: string;
  finalizada_at?: string;
}

interface ApiResponse {
  orders: OrdemServico[];
  total: number;
  limit: number;
  offset: number;
}

export default function AdminPanel() {
  const [orders, setOrders] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * limit;
      const params = new URLSearchParams({
        status: statusFilter,
        limit: limit.toString(),
        offset: offset.toString()
      });

      const response = await fetch(`/api/orders?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dados');
      }

      const data: ApiResponse = await response.json();
      setOrders(data.orders);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, currentPage]);

  const updateOrderStatus = async (id: number, newStatus: string) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar status');
      }

      await fetchOrders(); // Recarregar dados
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'aberta': { label: 'Aberta', variant: 'destructive' as const },
      'em_andamento': { label: 'Em Andamento', variant: 'default' as const },
      'finalizada': { label: 'Finalizada', variant: 'secondary' as const },
      'cancelada': { label: 'Cancelada', variant: 'outline' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (prioridade: number) => {
    return prioridade === 1 ? (
      <Badge variant="destructive">Alta</Badge>
    ) : (
      <Badge variant="outline">Normal</Badge>
    );
  };

  const filteredOrders = orders.filter(order =>
    order.usuario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.problema.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toString().includes(searchTerm)
  );

  const totalPages = Math.ceil(total / limit);

  const getStats = () => {
    const stats = {
      total: orders.length,
      aberta: orders.filter(o => o.status === 'aberta').length,
      em_andamento: orders.filter(o => o.status === 'em_andamento').length,
      finalizada: orders.filter(o => o.status === 'finalizada').length,
      alta_prioridade: orders.filter(o => o.prioridade === 1).length
    };
    return stats;
  };

  const stats = getStats();

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchOrders} className="w-full">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <img 
              src="https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/0878a9a2-a16f-4880-8a78-5c44194bf26c.png" 
              alt="Painel Administrativo Bot WhatsApp Atendimento Técnico"
              className="w-full h-32 object-cover rounded-lg mb-6"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="text-3xl font-bold text-gray-900">
              Painel de Atendimento WhatsApp
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie ordens de serviço e acompanhe o atendimento técnico
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Abertas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.aberta}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.em_andamento}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Finalizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.finalizada}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600">Alta Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.alta_prioridade}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nome, problema ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="aberta">Abertas</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="finalizada">Finalizadas</SelectItem>
                    <SelectItem value="cancelada">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchOrders} disabled={loading}>
                {loading ? 'Carregando...' : 'Atualizar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de OS */}
        <Card>
          <CardHeader>
            <CardTitle>Ordens de Serviço</CardTitle>
            <CardDescription>
              {filteredOrders.length} de {total} registros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Problema</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.usuario_nome}</div>
                          <div className="text-sm text-gray-500">{order.usuario_telefone}</div>
                        </div>
                      </TableCell>
                      <TableCell>{order.local_atendimento || 'N/I'}</TableCell>
                      <TableCell>{order.equipamento || 'N/I'}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={order.problema}>
                          {order.problema}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{getPriorityBadge(order.prioridade)}</TableCell>
                      <TableCell>{order.tecnico_responsavel || 'Não atribuído'}</TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {order.status === 'aberta' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, 'em_andamento')}
                            >
                              Iniciar
                            </Button>
                          )}
                          {order.status === 'em_andamento' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, 'finalizada')}
                            >
                              Finalizar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
