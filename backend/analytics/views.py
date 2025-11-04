from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count
from orders.models import Order
from products.models import Product
from clients.models import Client


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    stats = {
        'totalRevenue': Order.objects.filter(status='completed').aggregate(Sum('total_ttc'))['total_ttc__sum'] or 0,
        'totalOrders': Order.objects.count(),
        'totalClients': Client.objects.filter(is_active=True).count(),
        'totalProducts': Product.objects.filter(is_active=True).count(),
        'lowStockProducts': list(Product.objects.filter(total_stock__lte=5).values('id', 'name', 'reference', 'total_stock')[:10]),
        'recentOrders': list(Order.objects.select_related('client').order_by('-created_at')[:10].values(
            'id', 'order_number', 'client__first_name', 'client__last_name', 'store', 'total_ttc', 'status'
        ))
    }
    return Response(stats)
