import React, { useState, useLayoutEffect, useContext, useEffect } from "react"
import _ from "lodash"
import MainLayout from "../components/MainLayout"
import ZoneMasterView from "../components/ZoneMasterView"
import NationwideSummaryHeader from "../components/NationwideSummaryHeader"
import TotalVoterSummary from "../components/TotalVoterSummary"
import NationwideSubSummaryHeader from "../components/NationwideSubSummaryBox"
import PartyStatsList from "../components/PartyStatsList"
import CandidateStatsRow from "../components/CandidateStatsRow"
import { useSummaryData } from "../models/LiveDataSubscription"
import {
  partyStatsFromSummaryJSON,
  partyStatsRowTotalSeats,
} from "../models/PartyStats"
import {
  zones,
  filters,
  checkFilter,
  getZoneByProvinceIdAndZoneNo,
  getProvinceById,
  filterPath,
} from "../models/information"
import { ZoneFilterContext } from "../components/ZoneFilterPanel"
import CloseButton from "../components/CloseButton"
import { navigate } from "gatsby"
import { DISPLAY_FONT, labelColor } from "../styles"

export default ({ pageContext, location }) => (
  <MainLayout activeNavBarSection="by-area">
    <HomePageRedirector location={location}>
      <InertFilter
        value={pageContext.zoneView ? null : pageContext.filterName || "all"}
      >
        {filterName => (
          <ZoneFilterContext.Provider value={filterName}>
            <ZoneMasterView
              contentHeader={
                <SummaryHeaderContainer
                  key={filterName}
                  filterName={filterName}
                />
              }
              contentBody={
                <PartyStatsContainer key={filterName} filterName={filterName} />
              }
              popup={
                pageContext.zoneView ? (
                  <ZoneView {...pageContext.zoneView} />
                ) : null
              }
            />
          </ZoneFilterContext.Provider>
        )}
      </InertFilter>
    </HomePageRedirector>
  </MainLayout>
)

function HomePageRedirector({ location, children }) {
  const notReady =
    location.pathname === "/" &&
    location.hostname === "elect.thematter.co" &&
    (typeof window !== "undefined" && !window.localStorage.SKIP_ELECT_REDIRECT)
  useEffect(() => {
    if (notReady) {
      window.location.replace("https://elect.in.th/")
    }
  }, [notReady])
  if (notReady) {
    return (
      <h1
        css={{ padding: "3rem", textAlign: "center", fontFamily: DISPLAY_FONT }}
      >
        Coming soon!
      </h1>
    )
  }
  return children
}

function InertFilter({ value: filterNameFromRoute, children }) {
  const [filterName, setFilterName] = useState(filterNameFromRoute || "all")

  useLayoutEffect(() => {
    if (filterNameFromRoute !== null) {
      if (filterName !== filterNameFromRoute) {
        setFilterName(filterNameFromRoute)
      }
    }
  }, [filterName, filterNameFromRoute])

  return children(filterName)
}

/**
 * @param {object} props
 * @param {ZoneFilterName} props.filterName
 */
function SummaryHeaderContainer({ filterName }) {
  const summaryState = useSummaryData()
  const currentFilter = filters[filterName]
  const totalZoneCount = zones.filter(zone => checkFilter(currentFilter, zone))
    .length
  const title = currentFilter.name.th

  if (summaryState.loading) {
    return (
      <NationwideSummaryHeader
        title={title}
        loading
        totalZoneCount={totalZoneCount}
      />
    )
  }

  const summary = summaryState.data
  const allZoneStats = _.chain(summary.zoneStatsMap)
    .flatMap((zoneNoStatsMap, provinceId) =>
      _.map(zoneNoStatsMap, (stats, zoneNo) => ({
        provinceId: +provinceId,
        zoneNo: +zoneNo,
        stats,
      }))
    )
    .filter(row =>
      checkFilter(
        currentFilter,
        getZoneByProvinceIdAndZoneNo(row.provinceId, row.zoneNo)
      )
    )
    .map(row => row.stats)
    .value()

  const mockData = {
    totalZoneCount,
    completedZoneCount: _.sumBy(allZoneStats, s => (s.finished ? 1 : 0)),
    totalVoteCount: _.sumBy(allZoneStats, s => s.votesTotal),
    eligibleVoterCount: _.sumBy(allZoneStats, s => s.eligible),
  }
  return <NationwideSummaryHeader title={title} {...mockData} />
}

function PartyStatsContainer({ filterName }) {
  const summaryState = useSummaryData()
  if (summaryState.loading) return null

  const summary = summaryState.data
  const currentFilter = filters[filterName]
  const partyStats = partyStatsFromSummaryJSON(summary, currentFilter).filter(
    row => partyStatsRowTotalSeats(row) > 0
  )

  return <PartyStatsList partyStats={partyStats} />
}

function ZoneView({ provinceId, zoneNo }) {
  const zone = getZoneByProvinceIdAndZoneNo(provinceId, zoneNo)
  const province = getProvinceById(provinceId)
  const activeFilter = useContext(ZoneFilterContext)

  return (
    <div
      css={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        padding: 10,
      }}
    >
      <CloseButton onClick={() => navigate(filterPath(activeFilter))} />
      <div
        css={{
          textAlign: "center",
          flex: "none",
        }}
      >
        <h1 css={{ fontFamily: DISPLAY_FONT }}>{province.name}</h1>
        <h2 css={{ fontFamily: DISPLAY_FONT, color: labelColor }}>
          เขตเลือกตั้งที่ {zoneNo}
        </h2>
        <div>
          <span>นับแล้ว</span>
          <span
            css={{ marginLeft: 10, fontSize: "2rem", fontFamily: DISPLAY_FONT }}
          >
            00%
          </span>
        </div>

        <div
          css={{
            borderTop: "1px solid",
            // borderBottom: "1px solid",
            marginBottom: 10,
          }}
        >
          <TotalVoterSummary totalVoteCount={123456} totalVotePercentage={78} />
        </div>

        <div css={{ borderBottom: "1px solid" }}>
          <NationwideSubSummaryHeader label="บัตรดี" stat={77777} idx={0} />
          <NationwideSubSummaryHeader label="บัตรเสีย" stat={8080} idx={1} />
        </div>
      </div>
      <div css={{ flex: "auto", position: "relative" }}>
        <ul
          css={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            listStyle: "none",
            margin: 0,
            marginTop: 10,
            padding: 0,
            overflowX: "hidden",
            overflowY: "auto",
          }}
        >
          {_.range(0, 20).map(a => {
            return (
              <li key={a}>
                <CandidateStatsRow candidate={a + 1} />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
