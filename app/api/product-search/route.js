import { NextResponse } from 'next/server';
import { searchProductThisMonth } from '../../../lib/sales-service';

export const dynamic = 'force-dynamic';

function hasDbEnv() {
  return (
    Boolean(process.env.DB_HOST) &&
    Boolean(process.env.DB_USER) &&
    Boolean(process.env.DB_NAME)
  );
}

export async function GET(request) {
  try {
    if (!hasDbEnv()) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Database environment variables are not configured yet.',
      });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Search query is required' },
        { status: 400 }
      );
    }

    const data = await searchProductThisMonth(query.trim());
    return NextResponse.json({
      success: true,
      query,
      data,
    });
  } catch (error) {
    console.error('Error searching products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to search products' },
      { status: 500 }
    );
  }
}
