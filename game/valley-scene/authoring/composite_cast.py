"""Run in NatronRenderer interpreter with RIVER_CAST_OUTPUT set to the render directory."""
import os
folder=os.environ['RIVER_CAST_OUTPUT']
reader=app.createReader(os.path.join(folder,'frames','cast-####.png'))
grade=app.createNode('net.sf.openfx.GradePlugin')
grade.connectInput(0,reader)
grade.getParam('multiply').setValue(1.025,0)
writer=app.createWriter(os.path.join(folder,'graded','cast-####.png'))
writer.connectInput(0,grade)
app.saveProjectAs(os.path.join(folder,'cast-review.ntp'))
app.render(writer,1,72)
