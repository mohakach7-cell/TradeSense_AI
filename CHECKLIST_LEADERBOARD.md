# Checklist "Classement Traders OK"

Cette checklist vise à garantir l'exactitude et l'unicité du classement des traders, en évitant les doublons et en assurant que les métriques sont correctement agrégées et affichées.

## I. Fonction SQL `get_leaderboard()` (supabase/migrations/...)

*   **Unicité des Traders :**
    *   [x] La clause `GROUP BY p.id, p.full_name, p.avatar_url` est utilisée pour agréger les données par trader unique.
*   **Agrégation des Métriques :**
    *   [x] `SUM(c.total_pnl)` est utilisé pour le profit total.
    *   [x] `SUM(c.initial_balance)` est utilisé pour le capital initial agrégé.
    *   [x] `SUM((SELECT COUNT(*) FROM public.trades t WHERE t.challenge_id = c.id))` est utilisé pour le nombre total de trades.
    *   [x] `SUM((SELECT COUNT(*) FROM public.trades t WHERE t.challenge_id = c.id AND t.pnl > 0))` est utilisé pour le nombre de trades gagnants.
    *   [x] `MAX(c.plan)` et `MAX(c.status)` sont utilisés avec `OVER (PARTITION BY p.id ORDER BY c.updated_at DESC)` pour obtenir le plan et le statut les plus récents du trader.
    *   [x] `MAX(c.updated_at)` est utilisé pour la dernière activité du trader.
*   **Calcul du Pourcentage de Profit :**
    *   [x] La formule `ROUND((SUM(c.total_pnl)::numeric / NULLIF(SUM(c.initial_balance), 0) * 100), 2)` est utilisée pour un calcul précis du profit en pourcentage, avec `::numeric` pour la division flottante et `NULLIF` pour éviter la division par zéro.
*   **Filtrage Mensuel :**
    *   [x] La clause `WHERE c.updated_at >= DATE_TRUNC('month', NOW()) AND c.updated_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'` est appliquée pour inclure uniquement les traders actifs du mois en cours.
*   **Ordre de Tri :**
    *   [x] L'ordre de tri est `ORDER BY profit_percent DESC, (winning_trades * 100.0 / NULLIF(total_trades, 0)) DESC, total_trades DESC` (Profit% décroissant, puis Win% décroissant, puis Nombre de trades décroissant).
*   **Limite des Résultats :**
    *   [x] `LIMIT 10` est appliqué pour afficher uniquement les 10 meilleurs traders.
*   **Sécurité :**
    *   [x] La fonction est définie avec `SECURITY DEFINER` et `SET search_path = public`.

## II. Composant Client `Leaderboard.tsx` (src/components/dashboard/Leaderboard.tsx)

*   **Suppression de la Logique Redondante :**
    *   [x] Aucun filtrage, tri ou découpage (`slice`) n'est effectué côté client sur les données de `entries` après la récupération de `get_leaderboard()`.
    *   [x] Le composant utilise directement les données `entries` retournées par l'appel RPC.
*   **Affichage des Données :**
    *   [x] Les noms des traders (`full_name`), les pourcentages de profit, le nombre de trades, le taux de réussite et le statut sont correctement affichés.
    *   [x] Les icônes de classement (`getRankIcon`) et les badges de statut (`getStatusBadge`) sont appliqués correctement.

## III. Intégrité des Données et Processus de Migration

*   **Données des Profils :**
    *   [x] S'assurer que les champs `full_name` et `avatar_url` dans la table `public.profiles` sont correctement renseignés pour tous les utilisateurs.
*   **Cohérence des Données :**
    *   [x] Vérifier la cohérence des données dans les tables `public.challenges` et `public.trades`.
*   **Processus de Migration Supabase :**
    *   [x] Toujours tester les migrations localement avant de les pousser vers l'environnement de production.
    *   [x] Lors de la modification de fonctions existantes, utiliser `DROP FUNCTION IF EXISTS` avant `CREATE OR REPLACE FUNCTION` si la signature de la fonction (types de retour ou de paramètres) change.
    *   [x] Éviter l'utilisation de `IF NOT EXISTS` avec les déclarations `CREATE POLICY`, car ce n'est pas supporté par PostgreSQL pour les politiques RLS.
