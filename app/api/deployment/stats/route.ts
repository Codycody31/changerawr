/**
 * Deployment Stats API
 * Provides real-time deployment information to the maintenance page
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDeploymentInfo } from '@/lib/services/extensions/initialization.service';

export async function GET(req: NextRequest) {
  try {
    const deploymentInfo = getDeploymentInfo();

    return NextResponse.json({
      success: true,
      data: deploymentInfo,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to get deployment stats:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve deployment statistics',
    }, { status: 500 });
  }
}
