import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {ListRandom} from "@utils";
import {NgxUiLoaderModule, SPINNER} from "ngx-ui-loader";
import {SpinnerComponent} from "./components/spinner/spinner.component";

const spinnerTypes: SPINNER[] = [
  SPINNER.ballScaleMultiple,
  SPINNER.ballSpin,
  SPINNER.ballSpinClockwise,
  SPINNER.ballSpinClockwiseFadeRotating,
  SPINNER.chasingDots,
  SPINNER.circle,
  SPINNER.cubeGrid,
  SPINNER.doubleBounce,
  SPINNER.fadingCircle,
  SPINNER.foldingCube,
  SPINNER.pulse,
  SPINNER.rectangleBounce,
  SPINNER.rectangleBounceParty,
  SPINNER.rectangleBouncePulseOut,
  SPINNER.rectangleBouncePulseOutRapid,
  SPINNER.rotatingPlane,
  SPINNER.squareJellyBox,
  SPINNER.squareLoader,
  SPINNER.threeBounce,
  SPINNER.threeStrings,
  SPINNER.wanderingCubes
];

const spinnerTypeList = new ListRandom(spinnerTypes);

@NgModule({
  declarations: [SpinnerComponent],
  imports: [
    CommonModule,
    NgxUiLoaderModule.forRoot({
      fgsColor: "#2196f3",
      bgsColor: "#2196f3",
      pbColor: "#2196f3",
      fgsType: spinnerTypeList.next(),
      bgsType: spinnerTypeList.next(),
      bgsSize: 40,
      minTime: 100
    })
  ],
  exports: [SpinnerComponent]
})
export class SpinnerModule {}
