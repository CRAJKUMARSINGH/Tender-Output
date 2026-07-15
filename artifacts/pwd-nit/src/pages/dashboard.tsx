import React from "react";
import { Link } from "wouter";
import { useGetContractorStats, useListNitSessions } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSignature, Users, ArrowRight, Activity, CalendarClock, Building2 } from "lucide-react";
import { formatINR, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetContractorStats();
  const { data: sessions, isLoading: sessionsLoading } = useListNitSessions();

  const recentSessions = sessions?.slice(0, 5) || [];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-secondary tracking-tight">Executive Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage Notice Inviting Tenders and official generation workflows.</p>
          </div>
          <Link href="/sessions/new">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              <FileSignature className="w-5 h-5 mr-2" />
              New NIT Session
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Total Sessions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold font-serif text-secondary">{sessions?.length || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Active NIT workflows</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Registered Contractors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold font-serif text-secondary">{stats?.totalContractors || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Available in database</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border bg-sidebar text-sidebar-foreground">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-sidebar-foreground/80">Authority</CardTitle>
              <Building2 className="h-4 w-4 text-sidebar-foreground/80" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-serif">P.W.D. Division-II</div>
              <p className="text-xs text-sidebar-primary mt-1">Udaipur District</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm border-border md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-serif">Recent NIT Sessions</CardTitle>
                <CardDescription>Latest generated tender documents and workflows.</CardDescription>
              </div>
              <Link href="/sessions">
                <Button variant="outline" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg bg-muted/30">
                  <CalendarClock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p>No NIT sessions found.</p>
                  <Link href="/sessions/new">
                    <Button variant="link" className="mt-2 text-primary">Create the first session</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border border-t">
                  {recentSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between py-4 group">
                      <div className="space-y-1">
                        <Link href={`/sessions/${session.id}`} className="font-semibold text-secondary hover:text-primary transition-colors block">
                          {session.title}
                        </Link>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="font-medium text-secondary/80">{session.nitDetails?.nitNo}</span>
                          <span>&bull;</span>
                          <span>{formatDate(session.nitDetails?.nitDate)}</span>
                          <span>&bull;</span>
                          <span>{session.works?.length || 0} Works</span>
                        </div>
                      </div>
                      <Link href={`/sessions/${session.id}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
