import BigNumber from 'bignumber.js'
import React, { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import Button from '../../../components/Button'
import Card from '../../../components/Card'
import CardContent from '../../../components/CardContent'
import IconButton from '../../../components/IconButton'
import { AddIcon } from '../../../components/icons'
import Label from '../../../components/Label'
import useAllowance from '../../../hooks/useAllowance'
import useApprove from '../../../hooks/useApprove'
import useModal from '../../../hooks/useModal'
import useStake from '../../../hooks/useStake'
import useStakedBalance from '../../../hooks/useStakedBalance'
import useTokenBalance from '../../../hooks/useTokenBalance'
import useUnstake from '../../../hooks/useUnstake'
import { getBalanceNumber, getFullDisplayBalance } from '../../../utils/formatBalance'
import DepositModal from './DepositModal'
import WithdrawModal from './WithdrawModal'
import { getLPTokenStaked } from '../../../sushi/utils'
import useSushi from '../../../hooks/useSushi'
import useBlock from '../../../hooks/useBlock'
import useStakedValue from '../../../hooks/useStakedValue'
import usePoolActive from '../../../hooks/usePoolActive'

interface StakeProps {
  lpContract: any
  pid: number
  tokenName: string
  tokenSymbol: string
  token2Symbol: string
  project: string
  version: string,
  decimals: number,
  decimalsReward: number
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      marquee: any
    }
  }
}

const Stake: React.FC<StakeProps> = ({ lpContract, pid, tokenName, tokenSymbol, token2Symbol, project, version, decimals, decimalsReward }) => {
  const [requestedApproval, setRequestedApproval] = useState(false)
  const allowance = useAllowance(lpContract, version)
  const { onApprove } = useApprove(lpContract, version)

  const tokenBalance = useTokenBalance(lpContract.options.address)
  const stakedBalance = useStakedBalance(pid, version)
  let poolActive = usePoolActive(pid)

  if (pid === 3 && version === 'V2') {
    poolActive = false
  }

  const [totalStake, setTotalStake] = useState<BigNumber>()
  const sushi = useSushi()
  const block = useBlock()
  const stakedValue = useStakedValue(pid, project, version)

  useEffect(() => {
      async function fetchData() {
          const data = await getLPTokenStaked(sushi, pid, version)
          setTotalStake(data)
      }
      if (sushi && lpContract) {
          fetchData()
      }
  }, [sushi, setTotalStake, lpContract, block])

  const { onStake } = useStake(pid, version, decimals)
  const { onUnstake } = useUnstake(pid, version, decimals)

  const [onPresentDeposit] = useModal(
    <DepositModal
      max={tokenBalance}
      onConfirm={onStake}
      tokenName={tokenName}
      decimals={decimals}
    />,
  )

  const [onPresentWithdraw] = useModal(
    <WithdrawModal
      max={stakedBalance}
      onConfirm={onUnstake}
      tokenName={tokenName}
      decimals={decimals}
    />,
  )

  const handleApprove = useCallback(async () => {
    try {
      setRequestedApproval(true)
      const txHash = await onApprove()
      // user rejected tx or didn't go thru
      if (!txHash) {
        setRequestedApproval(false)
      }
    } catch (e) {
      console.log(e)
    }
  }, [onApprove, setRequestedApproval])

  var shareOfPool = 0

  if (totalStake && stakedBalance) {
    shareOfPool = stakedBalance.div(totalStake).toNumber()
  }

  var totalToken = 0
  var totalToken2 = 0

  if (stakedValue && stakedValue.tokenAmount && stakedValue.token2Amount && shareOfPool) {
    totalToken = (stakedValue.tokenAmount as any) * shareOfPool
    totalToken = parseFloat(totalToken.toFixed(2))
    totalToken2 = (stakedValue.token2Amount as any) * shareOfPool
    totalToken2 = parseFloat(totalToken2.toFixed(2))
  }

  const stakedVal = getBalanceNumber(stakedBalance, decimals).toFixed(8)

  return (
    <Card>
      <CardContent>
        <StyledCardContentInner>
          <StyledCardHeader>
            <StyledValue>
              <Label text={`Tokens Staked`} />
              <br/>
              {stakedVal.length > 15 && <marquee><ValueStyled>{stakedVal}</ValueStyled></marquee>}
              {stakedVal.length <= 15 && <ValueStyled>{stakedVal}</ValueStyled>}
              <br/>
              {/*<StyledContent>
                <div>{totalToken.toLocaleString('en-US')}<span style={{fontSize: 10}}> {tokenSymbol}</span></div>
                <div>{totalToken2.toLocaleString('en-US')}<span style={{fontSize: 10}}> {token2Symbol}</span></div>
              </StyledContent>*/}
            </StyledValue>
          </StyledCardHeader>
          {totalStake && stakedBalance &&
            <div style={{marginTop: 10}}>
              <span style={{color: '#fff'}}>Share of Pool: <span style={{fontSize: 18}}>
                {(shareOfPool * 100).toFixed(5)}%
              </span></span>
            </div>
          }
          <StyledCardActions>
            {!allowance.toNumber() ? (
              <Button
                disabled={requestedApproval}
                onClick={handleApprove}
                text={requestedApproval ? 'Approving...' : `Approve ${tokenName}`}
              />
            ) : (
              <>
                <Button
                  disabled={!poolActive}
                  text={'Stake'}
                  onClick={onPresentDeposit}
                />
                <StyledActionSpacer />
                <StyleButtonWrap>
                  <span className="tooltip-unstake">UnStake</span>
                  <IconButton
                    disabled={stakedBalance.eq(new BigNumber(0))}
                    onClick={onPresentWithdraw}>
                    <AddIcon />
                  </IconButton>
                </StyleButtonWrap>
              </>
            )}
          </StyledCardActions>
        </StyledCardContentInner>
      </CardContent>
    </Card>
  )
}

const StyledCardHeader = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
`
const StyledValue = styled.div`
  text-align: center;
  span{
    color: ${(props) => props.theme.color.white};
  }
`

const ValueStyled = styled.div`
  font-family: 'Nunito Sans', sans-serif;
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
`
const StyledCardActions = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${(props) => props.theme.spacing[6]}px;
  width: 100%;
`

const StyledActionSpacer = styled.div`
  height: ${(props) => props.theme.spacing[4]}px;
  width: ${(props) => props.theme.spacing[4]}px;
`

const StyledCardContentInner = styled.div`
  align-items: center;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
`
const StyleButtonWrap = styled.div`
  position: relative;

  border: 1px solid ${(props) => props.theme.color.grey[100]};
  border-radius: 12px;
  > .tooltip-unstake{
    position: absolute;
    font-size: 14px;
    font-weight: bold;
    top: -30px;
    left:-14px;
    color: ${(props) => props.theme.color.grey[100]};
    padding: 3px 10px;
    border-radius: 12px;
    background-color: ${(props) => props.theme.color.grey[500]};
    display: none;
    :after{
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: ${(props) => props.theme.color.grey[500]} transparent transparent transparent;

    }
  }
  &:hover{
    > .tooltip-unstake{
      display: block;
    }
  }
`
const StyledContent = styled.span`
    color: ${(props) => props.theme.color.white};
    font-weight: bold;
    display: block;
    @media (max-width: 767px) {
        font-size: 14px;
    }
`

export default Stake
